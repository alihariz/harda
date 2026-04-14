from flask import jsonify


def success(data=None, message="OK", status_code=200):
    """Standard success response. All API responses follow this shape."""
    return jsonify({"success": True, "data": data or {}, "message": message, "errors": []}), status_code


def error(message="An error occurred", errors=None, status_code=400):
    """Standard error response."""
    return jsonify({"success": False, "data": {}, "message": message, "errors": errors or []}), status_code
