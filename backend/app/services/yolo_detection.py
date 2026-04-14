from flask import current_app


class YOLODetectionService:
    """YOLO inference via Ultralytics YOLOv8. UC001/UC002.
    Do NOT train from scratch — load pretrained/fine-tuned weights only."""

    _model = None

    @classmethod
    def _get_model(cls):
        if cls._model is None:
            try:
                from ultralytics import YOLO
                model_path = current_app.config.get("YOLO_MODEL_PATH", "ml/weights/yolov8n.pt")
                cls._model = YOLO(model_path)
            except ImportError:
                raise RuntimeError("ultralytics is not installed. Run: pip install ultralytics")
        return cls._model

    @classmethod
    def analyse(cls, image_file):
        """Analyse an in-memory file object."""
        import tempfile, os
        suffix = ".jpg"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            image_file.save(tmp.name)
            tmp_path = tmp.name
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
                        "hazard_type": label,
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
