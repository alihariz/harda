"""
YOLO detection service for HARDA. UC001 / UC002.

Wraps Ultralytics YOLOv8 inference. Loads fine-tuned road-hazard weights from
the path in YOLO_MODEL_PATH (default ml/weights/pothole_yolov8s.pt). Returns
detections that meet the F2 confidence threshold (default 0.70) or a
low_confidence flag when nothing crosses it.

Multi-hazard per image (F2): all detections above threshold are returned in
the response. The DB still stores one primary hazard_type per report (the
top-confidence detection); the full list is surfaced in the API response so
the mobile/web client can show all detections to the user.

Performance (NFR3 < 5s): inference time is measured per request and included
in the response as `inference_ms`. The Flask logger also records it.
"""
import logging
import os
import tempfile
import time

from flask import current_app

logger = logging.getLogger(__name__)

# Map raw model class names → HARDA canonical hazard_types.
# Covers labels from common pothole / road-damage / RDD2022 datasets so the
# service works without changes when we swap weights for the 3-class fine-tuned
# model (Task #3).
_CLASS_MAP = {
    # pothole models — some datasets store the single class as "0" or "1"
    "pothole": "pothole",
    "pot hole": "pothole",
    "potholes": "pothole",
    "0": "pothole",   # peter_haddad/pothole-segmentation-yolo uses numeric label
    "1": "pothole",
    "d40": "pothole",  # RDD2022 class for potholes
    # crack / surface damage
    "crack": "uneven_surface",
    "alligator crack": "uneven_surface",
    "longitudinal crack": "uneven_surface",
    "transverse crack": "uneven_surface",
    "road damage": "uneven_surface",
    "uneven": "uneven_surface",
    "uneven_surface": "uneven_surface",
    "bump": "uneven_surface",
    "d00": "uneven_surface",  # RDD2022: longitudinal crack
    "d10": "uneven_surface",  # RDD2022: transverse crack
    "d20": "uneven_surface",  # RDD2022: alligator crack
    # lane marking
    "lane marking": "faded_lane_marking",
    "faded lane": "faded_lane_marking",
    "faded_lane_marking": "faded_lane_marking",
    "lane": "faded_lane_marking",
    "blur": "faded_lane_marking",
}


def _map_class(raw_label: str) -> str:
    """Normalise a raw model class name to a HARDA hazard type.
    Falls back to 'uneven_surface' for unknown classes."""
    return _CLASS_MAP.get(raw_label.lower().strip(), "uneven_surface")


class YOLODetectionService:
    """YOLO inference via Ultralytics YOLOv8. UC001 / UC002.
    Do NOT train from scratch — load pretrained / fine-tuned weights only."""

    _model = None
    _model_path = None  # last loaded path; lets us hot-swap when config changes

    @classmethod
    def _resolve_model_path(cls):
        model_path = current_app.config.get("YOLO_MODEL_PATH", "ml/weights/yolov8n.pt")
        if not os.path.isabs(model_path):
            # Relative paths in .env are relative to the project root (harda/).
            # __file__ → backend/app/services/yolo_detection.py, 4 levels up = harda/.
            project_root = os.path.dirname(
                os.path.dirname(
                    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                )
            )
            model_path = os.path.join(project_root, model_path)
        return model_path

    @classmethod
    def _get_model(cls):
        target_path = cls._resolve_model_path()
        if cls._model is not None and cls._model_path == target_path:
            return cls._model
        try:
            from ultralytics import YOLO
        except ImportError:
            raise RuntimeError("ultralytics is not installed. Run: pip install ultralytics")
        logger.info("Loading YOLO model from %s", target_path)
        cls._model = YOLO(target_path)
        cls._model_path = target_path
        try:
            class_names = list(cls._model.names.values()) if hasattr(cls._model, "names") else []
            logger.info("YOLO classes loaded: %s", class_names)
        except Exception:
            pass
        return cls._model

    @classmethod
    def model_info(cls):
        """Diagnostic — returns the loaded model path and class list."""
        try:
            model = cls._get_model()
            names = dict(model.names) if hasattr(model, "names") else {}
            return {
                "model_path": cls._model_path,
                "classes": names,
                "n_classes": len(names),
            }
        except Exception as exc:
            return {"error": str(exc), "model_path": cls._resolve_model_path()}

    @classmethod
    def analyse(cls, image_file):
        """Analyse an in-memory file object."""
        suffix = ".jpg"
        # Close the handle before writing on Windows — open handle blocks the write otherwise.
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp_path = tmp.name
        tmp.close()
        image_file.save(tmp_path)
        try:
            return cls.analyse_path(tmp_path)
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    @classmethod
    def analyse_path(cls, image_path):
        """Run YOLO on a file path. Returns (detection_dict, error).
        Confidence threshold: 0.70 (F2). Performance: NFR3 < 5s per image."""
        threshold = current_app.config.get("YOLO_CONFIDENCE_THRESHOLD", 0.70)
        try:
            model = cls._get_model()
            t_start = time.perf_counter()
            # verbose=False silences Ultralytics' per-image stdout dump in production.
            results = model(image_path, verbose=False)
            inference_ms = round((time.perf_counter() - t_start) * 1000, 2)

            detections = []
            for result in results:
                for box in result.boxes:
                    conf = float(box.conf[0])
                    cls_id = int(box.cls[0])
                    label = result.names[cls_id]
                    bbox = box.xyxy[0].tolist()
                    detections.append({
                        "hazard_type": _map_class(label),
                        "raw_label": label,
                        "confidence": round(conf, 4),
                        "bounding_box": [round(v, 2) for v in bbox],
                    })

            logger.info(
                "YOLO inference: %d raw detections in %sms (threshold=%s)",
                len(detections), inference_ms, threshold,
            )
            if inference_ms > 5000:
                logger.warning(
                    "YOLO inference exceeded NFR3 budget (5000ms): %sms — investigate model size or hardware",
                    inference_ms,
                )

            if not detections:
                return {
                    "low_confidence": True,
                    "inference_ms": inference_ms,
                    "model_path": os.path.basename(cls._model_path or ""),
                    "detections": [],
                }, None

            # F2: multi-hazard per image. Surface ALL passing detections, but
            # pick the best one as the primary (DB stores one hazard_type per report).
            passing = [d for d in detections if d["confidence"] >= threshold]
            if not passing:
                return {
                    "low_confidence": True,
                    "inference_ms": inference_ms,
                    "model_path": os.path.basename(cls._model_path or ""),
                    "detections": detections,  # below-threshold detections still surfaced for debugging
                }, None

            best = max(passing, key=lambda d: d["confidence"])
            severity_score = cls._confidence_to_severity(best["confidence"])
            return {
                "low_confidence": False,
                "hazard_type": best["hazard_type"],
                "confidence": best["confidence"],
                "severity_score": severity_score,
                "bounding_boxes": [d["bounding_box"] for d in passing],
                "detections": passing,
                "inference_ms": inference_ms,
                "model_path": os.path.basename(cls._model_path or ""),
            }, None
        except Exception as exc:
            logger.exception("YOLO inference failed")
            return None, str(exc)

    @staticmethod
    def _confidence_to_severity(confidence):
        """Map YOLO confidence (0.70–1.0) to severity score 1–5."""
        if confidence >= 0.95:
            return 5
        if confidence >= 0.87:
            return 4
        if confidence >= 0.80:
            return 3
        if confidence >= 0.74:
            return 2
        return 1
