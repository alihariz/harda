from flask import Blueprint, request
from app.utils.responses import success, error
from app.services.yolo_detection import YOLODetectionService
from app.services.image_processing import ImageProcessingService

detection_bp = Blueprint("detection", __name__)


@detection_bp.route("/analyse", methods=["POST"])
def analyse():
    """UC001/UC002 – Run YOLO on uploaded image.
    Returns: { hazard_type, confidence, bounding_boxes, severity_score }
    Rejects detections below the 0.70 confidence threshold (low_confidence flag)."""
    if "image" not in request.files:
        return error("No image file provided")
    image_file = request.files["image"]
    if not image_file.filename:
        return error("No file selected")
    if not ImageProcessingService.allowed_file(image_file.filename):
        return error("Invalid file type. Allowed: jpg, jpeg, png")
    result, err = YOLODetectionService.analyse(image_file)
    if err:
        return error(err, status_code=500)
    return success(result)
