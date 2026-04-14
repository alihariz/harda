from flask import Blueprint
from app.utils.responses import success, error
from app.services.geolocation import GeolocationService

locations_bp = Blueprint("locations", __name__)


@locations_bp.route("/hazards", methods=["GET"])
def hazard_locations():
    """UC003 – All verified hazard locations for map markers."""
    result, err = GeolocationService.get_verified_hazard_locations()
    if err:
        return error(err)
    return success(result)


@locations_bp.route("/hotspots", methods=["GET"])
def hotspots():
    """UC003 – Clustered hazard locations by area."""
    result, err = GeolocationService.get_hotspots()
    if err:
        return error(err)
    return success(result)
