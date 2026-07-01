from flask import Blueprint, request, current_app
from app import limiter
from app.utils.responses import success, error
from app.utils.auth import admin_required
from app.services.yolo_detection import YOLODetectionService
from app.services.image_processing import ImageProcessingService

detection_bp = Blueprint("detection", __name__)


@detection_bp.route("/analyse", methods=["POST"])
@limiter.limit(lambda: current_app.config["RATELIMIT_DETECTION"])  # NFR8 — protect the expensive YOLO path
def analyse():
    """UC001 / UC002 — Run YOLO on uploaded image.
    Returns: { hazard_type, confidence, bounding_boxes, severity_score,
               detections[], inference_ms, model_path }
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


@detection_bp.route("/model-info", methods=["GET"])
@admin_required
def model_info():
    """Diagnostic — returns the loaded YOLO weights path and class list.
    Restricted to admins; not for public consumption."""
    return success(YOLODetectionService.model_info())
