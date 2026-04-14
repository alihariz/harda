from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity
from app.utils.responses import success, error
from app.utils.auth import admin_required
from app.services.hazard_reporting import HazardReportingService
from app.services.report_generation import ReportGenerationService

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/reports", methods=["GET"])
@admin_required
def all_reports():
    """UC008 – All reports with full metadata; filterable."""
    filters = {
        "status": request.args.get("status"),
        "hazard_type": request.args.get("hazard_type"),
        "start_date": request.args.get("start_date"),
        "end_date": request.args.get("end_date"),
        "page": int(request.args.get("page", 1)),
        "per_page": int(request.args.get("per_page", 20)),
    }
    result, err = HazardReportingService.list_reports(filters, admin_view=True)
    if err:
        return error(err)
    return success(result)


@admin_bp.route("/reports/pending", methods=["GET"])
@admin_required
def pending_reports():
    """UC008 – Reports awaiting validation."""
    result, err = HazardReportingService.get_pending_reports()
    if err:
        return error(err)
    return success(result)


@admin_bp.route("/reports/bulk-action", methods=["POST"])
@admin_required
def bulk_action():
    """UC011 – Bulk validate/reject/update reports."""
    data = request.get_json()
    admin_id = get_jwt_identity()
    result, err = HazardReportingService.bulk_action(admin_id, data)
    if err:
        return error(err)
    return success(result, "Bulk action applied")


@admin_bp.route("/analytics/summary", methods=["GET"])
@admin_required
def analytics_summary():
    """UC012 – Dashboard stats (totals, trends)."""
    result, err = ReportGenerationService.get_summary()
    if err:
        return error(err)
    return success(result)


@admin_bp.route("/system-reports", methods=["POST"])
@admin_required
def generate_report():
    """UC012 – Generate analytical report."""
    data = request.get_json()
    admin_id = get_jwt_identity()
    result, err = ReportGenerationService.generate(admin_id, data)
    if err:
        return error(err)
    return success(result, "Report generated", 201)


@admin_bp.route("/system-reports", methods=["GET"])
@admin_required
def list_system_reports():
    """UC012 – List generated reports."""
    result, err = ReportGenerationService.list_reports()
    if err:
        return error(err)
    return success(result)
