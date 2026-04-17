from flask import current_app

# Map raw model class names → HARDA canonical hazard_types.
# Covers labels from common pothole/road-damage datasets.
_CLASS_MAP = {
    # pothole models — some datasets store the single class as "0" or "1"
    "pothole": "pothole",
    "pot hole": "pothole",
    "potholes": "pothole",
    "0": "pothole",   # peterhdd/pothole-detection-yolov8 uses numeric label
    "1": "pothole",
    # crack / surface damage
    "crack": "uneven_surface",
    "alligator crack": "uneven_surface",
    "longitudinal crack": "uneven_surface",
    "transverse crack": "uneven_surface",
    "road damage": "uneven_surface",
    "uneven": "uneven_surface",
    "bump": "uneven_surface",
    # lane marking
    "lane marking": "faded_lane_marking",
    "faded lane": "faded_lane_marking",
    "lane": "faded_lane_marking",
}


def _map_class(raw_label: str) -> str:
    """Normalise a raw model class name to a HARDA hazard type.
    Falls back to 'uneven_surface' for unknown classes."""
    return _CLASS_MAP.get(raw_label.lower().strip(), "uneven_surface")


class YOLODetectionService:
    """YOLO inference via Ultralytics YOLOv8. UC001/UC002.
    Do NOT train from scratch — load pretrained/fine-tuned weights only."""

    _model = None

    @classmethod
    def _get_model(cls):
        if cls._model is None:
            try:
                import os
                from ultralytics import YOLO
                model_path = current_app.config.get("YOLO_MODEL_PATH", "ml/weights/yolov8n.pt")
                # Relative paths in .env are relative to the project root (harda/).
                # __file__ is at backend/app/services/yolo_detection.py — 4 levels up to reach harda/.
                if not os.path.isabs(model_path):
                    project_root = os.path.dirname(
                        os.path.dirname(
                            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                        )
                    )
                    model_path = os.path.join(project_root, model_path)
                cls._model = YOLO(model_path)
            except ImportError:
                raise RuntimeError("ultralytics is not installed. Run: pip install ultralytics")
        return cls._model

    @classmethod
    def analyse(cls, image_file):
        """Analyse an in-memory file object."""
        import tempfile, os
        suffix = ".jpg"
        # Close the handle before writing on Windows — open handle blocks the write otherwise.
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp_path = tmp.name
        tmp.close()
        image_file.save(tmp_path)
        try:
            return cls.analyse_path(tmp_path)
        finally:
            os.unlink(tmp_path)

    @classmethod
    def analyse_path(cls, image_path):
        """Run YOLO on a file path. Returns detection dict or low_confidence flag.
        Confidence threshold: 0.70 (F2 requirement)."""
        threshold = current_app.config.get("YOLO_CONFIDENCE_THRESHOLD", 0.70)
        try:
            model = cls._get_model()
            results = model(image_path)
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
                        "bounding_box": bbox,
                    })

            if not detections:
                return {"low_confidence": True, "detections": []}, None

            best = max(detections, key=lambda d: d["confidence"])
            if best["confidence"] < threshold:
                return {"low_confidence": True, "detections": detections}, None

            severity_score = cls._confidence_to_severity(best["confidence"])
            return {
                "low_confidence": False,
                "hazard_type": best["hazard_type"],
                "confidence": best["confidence"],
                "severity_score": severity_score,
                "bounding_boxes": [d["bounding_box"] for d in detections],
                "detections": detections,
            }, None
        except Exception as exc:
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
