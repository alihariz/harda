from datetime import datetime

from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity
from app.utils.responses import success, error
from app.utils.auth import admin_required
from app.services.hazard_reporting import HazardReportingService
from app.services.report_generation import ReportGenerationService
from app.services.user_management import UserManagementService

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
        "include_archived": request.args.get("include_archived") == "true",
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
    """UC011 – Bulk validate/reject/update/archive/unarchive reports."""
    data = request.get_json() or {}
    admin_id = get_jwt_identity()
    action = data.get("action", "")
    if action == "archive":
        report_ids = data.get("report_ids", [])
        result, err = HazardReportingService.bulk_archive(admin_id, report_ids)
        if err:
            return error(err)
        return success(result, "Bulk archive applied")
    if action == "unarchive":
        report_ids = data.get("report_ids", [])
        results = []
        for rid in report_ids:
            r, _ = HazardReportingService.unarchive_report(rid)
            if r:
                results.append(r["report_id"])
        return success({"unarchived": len(results), "report_ids": results}, "Bulk unarchive applied")
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


# ── Progress 2: teams + assignment ────────────────────────────────────────────


@admin_bp.route("/teams", methods=["GET"])
@admin_required
def list_teams():
    """Progress 2 — List all field-crew teams (admin pickers, assignment UI)."""
    from app.models.team import Team
    teams = Team.query.order_by(Team.team_name).all()
    return success([t.to_dict(include_member_count=True) for t in teams])


@admin_bp.route("/teams", methods=["POST"])
@admin_required
def create_team():
    """Progress 2 — Create a new field-crew team."""
    from app import db
    from app.models.team import Team
    data = request.get_json() or {}
    name = (data.get("team_name") or "").strip()
    if not name:
        return error("team_name is required")
    if Team.query.filter_by(team_name=name).first():
        return error("Team with that name already exists", status_code=409)
    team = Team(
        team_name=name,
        region=data.get("region"),
        description=data.get("description"),
        lead_admin_id=int(get_jwt_identity()),
        created_date=datetime.utcnow(),
        is_active=True,
    )
    db.session.add(team)
    db.session.commit()
    return success(team.to_dict(include_member_count=True), "Team created", 201)


@admin_bp.route("/hazard-types", methods=["GET"])
@admin_required
def list_hazard_types():
    """UC011 — Hazard-type lookup for the admin edit dropdown."""
    from app.models.hazard_type import HazardType
    types = HazardType.query.order_by(HazardType.type_name).all()
    return success([t.to_dict() for t in types])


@admin_bp.route("/reports/<int:report_id>", methods=["PUT"])
@admin_required
def edit_report(report_id):
    """UC011 — Manage Hazard Data: admin corrects type, severity, title,
    description, visibility, or location without touching status."""
    data = request.get_json() or {}
    result, err = HazardReportingService.admin_edit_report(
        report_id=report_id,
        admin_id=get_jwt_identity(),
        data=data,
    )
    if err:
        return error(err)
    return success(result, "Report updated")


@admin_bp.route("/reports/<int:report_id>/archive", methods=["POST"])
@admin_required
def archive_report(report_id):
    """UC011 — Explicit archive action on a resolved/rejected report."""
    admin_id = get_jwt_identity()
    result, err = HazardReportingService.archive_report(report_id, admin_id)
    if err:
        return error(err, status_code=400)
    return success(result, "Report archived")


@admin_bp.route("/reports/<int:report_id>/unarchive", methods=["POST"])
@admin_required
def unarchive_report(report_id):
    """UC011 — Restore an archived report back to the active queue."""
    result, err = HazardReportingService.unarchive_report(report_id)
    if err:
        return error(err, status_code=400)
    return success(result, "Report unarchived")


@admin_bp.route("/reports/<int:report_id>/assign", methods=["PUT"])
@admin_required
def assign_team(report_id):
    """Progress 2 / Sufie's stakeholder feature — Admin assigns a field-crew team
    to a verified report. Status transitions to in_progress automatically."""
    data = request.get_json() or {}
    team_id = data.get("team_id")
    if team_id is None:
        return error("team_id is required")
    result, err = HazardReportingService.assign_team(
        report_id=report_id,
        admin_id=get_jwt_identity(),
        team_id=team_id,
    )
    if err:
        return error(err)
    return success(result, "Team assigned")


@admin_bp.route("/archive", methods=["GET"])
@admin_required
def resolved_archive():
    """Progress 2 / UC012 — Explicitly archived reports (resolved + rejected).
    Counter-feature to Roadcare's lost-history flaw flagged by Sufie."""
    filters = {
        "state": request.args.get("state"),
        "team_id": request.args.get("team_id"),
        "status": request.args.get("status"),
    }
    result, err = HazardReportingService.get_resolved_archive(filters)
    if err:
        return error(err)
    return success(result)


@admin_bp.route("/archive/export.csv", methods=["GET"])
@admin_required
def resolved_archive_csv():
    """Progress 2 / UC012 — CSV export of the archived-hazard archive."""
    from flask import Response
    filters = {
        "state": request.args.get("state"),
        "team_id": request.args.get("team_id"),
        "status": request.args.get("status"),
    }
    body, err = ReportGenerationService.export_archive_csv(filters)
    if err:
        return error(err)
    return Response(
        body,
        mimetype="text/csv",
        headers={
            "Content-Disposition": (
                f"attachment; filename=harda_archive_"
                f"{datetime.utcnow():%Y%m%d}.csv"
            )
        },
    )


# ── UC007 — Admin / crew / user account management ───────────────────────────


@admin_bp.route("/admins", methods=["GET"])
@admin_required
def list_admins():
    """UC007 — List all admin accounts."""
    result, err = UserManagementService.list_admins()
    if err:
        return error(err)
    return success(result)


@admin_bp.route("/admins", methods=["POST"])
@admin_required
def create_admin():
    """UC007 — Create a new admin account."""
    data = request.get_json() or {}
    result, err = UserManagementService.create_admin(data)
    if err:
        return error(err, status_code=400)
    return success(result, "Admin account created", 201)


@admin_bp.route("/admins/<int:admin_id>", methods=["DELETE"])
@admin_required
def delete_admin(admin_id):
    """UC007 — Permanently delete an admin account."""
    requesting = int(get_jwt_identity())
    result, err = UserManagementService.delete_admin(admin_id, requesting)
    if err:
        return error(err, status_code=400)
    return success(result, "Admin account deleted")


@admin_bp.route("/crew", methods=["GET"])
@admin_required
def list_crew():
    """UC007 — List all crew member accounts."""
    result, err = UserManagementService.list_crew()
    if err:
        return error(err)
    return success(result)


@admin_bp.route("/crew", methods=["POST"])
@admin_required
def create_crew():
    """UC007 — Create a new crew account assigned to a team."""
    data = request.get_json() or {}
    result, err = UserManagementService.create_crew(data)
    if err:
        return error(err, status_code=400)
    return success(result, "Crew account created", 201)


@admin_bp.route("/users/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    """UC007 — Permanently delete a user or crew account."""
    result, err = UserManagementService.delete_user(user_id)
    if err:
        return error(err, status_code=400)
    return success(result, "Account deleted")
