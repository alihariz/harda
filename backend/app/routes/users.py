from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.utils.responses import success, error
from app.utils.auth import admin_required
from app.services.user_management import UserManagementService

users_bp = Blueprint("users", __name__)


@users_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
def get_user(user_id):
    """UC006 – Get user profile."""
    result, err = UserManagementService.get_user(user_id)
    if err:
        return error(err, status_code=404)
    return success(result)


@users_bp.route("/<int:user_id>", methods=["PUT"])
@jwt_required()
def update_user(user_id):
    """UC006 – Update profile."""
    data = request.get_json()
    result, err = UserManagementService.update_user(user_id, data)
    if err:
        return error(err)
    return success(result, "Profile updated")


@users_bp.route("/admin/users", methods=["GET"])
@admin_required
def list_users():
    """UC007 – Admin: list all users."""
    result, err = UserManagementService.list_users()
    if err:
        return error(err)
    return success(result)


@users_bp.route("/admin/users/<int:user_id>/status", methods=["PUT"])
@admin_required
def set_user_status(user_id):
    """UC007 – Admin: activate/deactivate user."""
    data = request.get_json()
    result, err = UserManagementService.set_user_status(user_id, data.get("is_active"))
    if err:
        return error(err)
    return success(result, "User status updated")
