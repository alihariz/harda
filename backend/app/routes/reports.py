from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.responses import success, error
from app.utils.auth import jwt_optional_or_guest, admin_required
from app.services.hazard_reporting import HazardReportingService

reports_bp = Blueprint("reports", __name__)


@reports_bp.route("", methods=["POST"])
@jwt_optional_or_guest
def submit_report():
    """UC001 – Submit hazard report with image. Guest submissions allowed (no auth required)."""
    user_id = get_jwt_identity()  # None for guests
    result, err = HazardReportingService.submit_report(request, user_id)
    if err:
        return error(err, status_code=400)
    return success(result, "Report submitted successfully", 201)


@reports_bp.route("", methods=["GET"])
def list_reports():
    """UC003/UC004 – List reports; filterable by status, type, location."""
    filters = {
        "status": request.args.get("status"),
        "hazard_type": request.args.get("hazard_type"),
        "state": request.args.get("state"),
        "page": int(request.args.get("page", 1)),
        "per_page": int(request.args.get("per_page", 20)),
    }
    result, err = HazardReportingService.list_reports(filters)
    if err:
        return error(err)
    return success(result)


@reports_bp.route("/map", methods=["GET"])
def map_reports():
    """UC003 – Returns all public verified reports with lat/lng for map rendering."""
    result, err = HazardReportingService.get_map_reports()
    if err:
        return error(err)
    return success(result)


@reports_bp.route("/<int:report_id>", methods=["GET"])
def get_report(report_id):
    """UC004 – Get report details including detection result."""
    result, err = HazardReportingService.get_report(report_id)
    if err:
        return error(err, status_code=404)
    return success(result)


@reports_bp.route("/user/<int:user_id>", methods=["GET"])
@jwt_required()
def user_reports(user_id):
    """UC005 – User's own submission history."""
    result, err = HazardReportingService.get_user_reports(user_id)
    if err:
        return error(err)
    return success(result)


@reports_bp.route("/<int:report_id>/status", methods=["PUT"])
@admin_required
def update_status(report_id):
    """UC010 – Admin: update report status."""
    data = request.get_json()
    result, err = HazardReportingService.update_status(report_id, data)
    if err:
        return error(err)
    return success(result, "Status updated")


@reports_bp.route("/<int:report_id>/validate", methods=["PUT"])
@admin_required
def validate_report(report_id):
    """UC009 – Admin: validate and set hazard type."""
    data = request.get_json()
    admin_id = get_jwt_identity()
    result, err = HazardReportingService.validate_report(report_id, admin_id, data)
    if err:
        return error(err)
    return success(result, "Report validated")


@reports_bp.route("/<int:report_id>", methods=["DELETE"])
@admin_required
def delete_report(report_id):
    """UC011 – Admin: delete report."""
    err = HazardReportingService.delete_report(report_id)
    if err:
        return error(err, status_code=404)
    return success(message="Report deleted")
