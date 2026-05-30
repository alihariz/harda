from flask import Blueprint, request
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from app.utils.responses import success, error
from app.services.user_management import UserManagementService

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    """UC006 – User registration."""
    data = request.get_json()
    result, err = UserManagementService.register_user(data)
    if err:
        return error(err, status_code=400)
    return success(result, "User registered successfully", 201)


@auth_bp.route("/login", methods=["POST"])
def login():
    """User login → returns JWT. Token claims include `role` (user/crew) and
    `team_id` (for crew) so the mobile app can route to user vs crew tabs
    without an extra round-trip."""
    data = request.get_json()
    user, err = UserManagementService.authenticate_user(data.get("email"), data.get("password"))
    if err:
        return error(err, status_code=401)
    claims = {"role": user.role or "user"}
    if user.team_id is not None:
        claims["team_id"] = user.team_id
    access_token = create_access_token(identity=str(user.user_id), additional_claims=claims)
    refresh_token = create_refresh_token(identity=str(user.user_id), additional_claims=claims)
    return success({"access_token": access_token, "refresh_token": refresh_token, "user": user.to_dict()})


@auth_bp.route("/admin/login", methods=["POST"])
def admin_login():
    """Admin login → returns JWT with admin role claim."""
    data = request.get_json()
    from app.services.user_management import UserManagementService
    admin, err = UserManagementService.authenticate_admin(data.get("email"), data.get("password"))
    if err:
        return error(err, status_code=401)
    access_token = create_access_token(identity=str(admin.admin_id), additional_claims={"role": "admin"})
    refresh_token = create_refresh_token(identity=str(admin.admin_id))
    return success({"access_token": access_token, "refresh_token": refresh_token, "admin": admin.to_dict()})


@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    """Invalidate token (client-side; extend with a blocklist if needed)."""
    return success(message="Logged out successfully")


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Refresh JWT access token."""
    identity = get_jwt_identity()
    claims = {}  # re-attach role claim from refresh token if needed
    access_token = create_access_token(identity=identity)
    return success({"access_token": access_token})
