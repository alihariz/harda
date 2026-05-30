from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from app.utils.responses import error


def admin_required(fn):
    """Decorator that restricts a route to admin JWT tokens."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("role") != "admin":
            return error("Admin access required", status_code=403)
        return fn(*args, **kwargs)
    return wrapper


def crew_required(fn):
    """Decorator that restricts a route to field-crew JWT tokens.
    Progress 2: crew members upload after-photos and view their team's
    assignment inbox."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("role") != "crew":
            return error("Field-crew access required", status_code=403)
        return fn(*args, **kwargs)
    return wrapper


def jwt_optional_or_guest(fn):
    """Allows both authenticated users and guests (no token required).
    Use on endpoints like POST /reports where guest submissions are valid. UC001."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # verify_jwt_in_request with optional=True won't raise if no token present
        verify_jwt_in_request(optional=True)
        return fn(*args, **kwargs)
    return wrapper
