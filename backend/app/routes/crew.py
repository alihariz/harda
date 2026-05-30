"""
Field-crew routes (Progress 2). Crew users log in via /auth/login like any
other user account; their JWT carries `role=crew` and `team_id=<n>`. These
endpoints power the mobile app's crew-mode screens.

Sufie's stakeholder requirement: admins assign reports to teams; crew members
on those teams clear them on-site and upload an 'after' photo.
"""
from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity

from app.utils.responses import success, error
from app.utils.auth import crew_required
from app.services.hazard_reporting import HazardReportingService

crew_bp = Blueprint("crew", __name__)


@crew_bp.route("/assignments", methods=["GET"])
@crew_required
def my_assignments():
    """Crew assignment inbox — reports assigned to the crew's team.
    Defaults to non-resolved; pass ?include_resolved=true to see history."""
    claims = get_jwt()
    team_id = claims.get("team_id")
    if team_id is None:
        return error("Your account is not associated with any team", status_code=400)

    include_resolved = request.args.get("include_resolved", "false").lower() == "true"
    result, err = HazardReportingService.get_team_assignments(
        team_id=team_id, include_resolved=include_resolved
    )
    if err:
        return error(err)
    return success({"team_id": team_id, "assignments": result})


@crew_bp.route("/me", methods=["GET"])
@crew_required
def crew_profile():
    """Diagnostic — returns the crew user's identity + team for the mobile app."""
    from app.models.user import User
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return error("User not found", status_code=404)
    return success(user.to_dict())
