"""
ml/detect.py — Standalone YOLO detection script for HARDA.

Wraps YOLOv8n (pretrained) as a placeholder until fine-tuned road-hazard
weights are available. Accepts one or more image paths from the command line
and prints JSON results to stdout.

Usage:
    python ml/detect.py path/to/image.jpg [path/to/another.jpg ...]

Fine-tuning workflow (run once a labelled dataset is ready):
    from ultralytics import YOLO
    model = YOLO("yolov8n.pt")
    model.train(data="dataset.yaml", epochs=50, imgsz=640)
    # Then set YOLO_MODEL_PATH=ml/weights/best.pt in .env

Confidence threshold is read from YOLO_CONFIDENCE_THRESHOLD env var (default 0.70).
"""

import argparse
import json
import os
import sys
from pathlib import Path

CONFIDENCE_THRESHOLD = float(os.getenv("YOLO_CONFIDENCE_THRESHOLD", 0.70))
MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "ml/weights/yolov8n.pt")


def _confidence_to_severity(confidence: float) -> int:
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


def load_model(model_path: str):
    """Load YOLOv8 model. Downloads yolov8n.pt on first run if not present."""
    try:
        from ultralytics import YOLO
    except ImportError:
        print("ERROR: ultralytics is not installed. Run: pip install ultralytics", file=sys.stderr)
        sys.exit(1)

    weights = Path(model_path)
    if not weights.exists():
        # Fall back to auto-download of base yolov8n weights
        print(f"Weights not found at {model_path!r}, using yolov8n (auto-download).", file=sys.stderr)
        return YOLO("yolov8n.pt")
    return YOLO(str(weights))


def analyse_image(model, image_path: str, threshold: float = CONFIDENCE_THRESHOLD) -> dict:
    """Run inference on a single image path. Returns detection result dict."""
    results = model(image_path)

    detections = []
    for result in results:
        for box in result.boxes:
            conf = float(box.conf[0])
            cls_id = int(box.cls[0])
            label = result.names[cls_id]
            bbox = box.xyxy[0].tolist()
            detections.append(
                {
                    "hazard_type": label,
                    "confidence": round(conf, 4),
                    "bounding_box": [round(v, 2) for v in bbox],
                }
            )

    if not detections:
        return {"low_confidence": True, "detections": []}

    best = max(detections, key=lambda d: d["confidence"])

    if best["confidence"] < threshold:
        return {"low_confidence": True, "detections": detections}

    return {
        "low_confidence": False,
        "hazard_type": best["hazard_type"],
        "confidence": best["confidence"],
        "severity_score": _confidence_to_severity(best["confidence"]),
        "bounding_boxes": [d["bounding_box"] for d in detections],
        "detections": detections,
    }


def main():
    parser = argparse.ArgumentParser(description="HARDA — YOLO road hazard detection")
    parser.add_argument("images", nargs="+", help="Image file path(s) to analyse")
    parser.add_argument(
        "--model", default=MODEL_PATH, help="Path to YOLO weights (default: ml/weights/yolov8n.pt)"
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=CONFIDENCE_THRESHOLD,
        help="Confidence threshold (default: 0.70)",
    )
    args = parser.parse_args()

    model = load_model(args.model)

    output = {}
    for img_path in args.images:
        if not Path(img_path).exists():
            output[img_path] = {"error": "File not found"}
            continue
        output[img_path] = analyse_image(model, img_path, threshold=args.threshold)

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
