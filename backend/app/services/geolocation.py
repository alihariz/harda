from app import db
from app.models.hazard_report import HazardReport
from app.models.hazard_status import HazardStatus
from app.models.location import Location


class GeolocationService:

    @staticmethod
    def get_verified_hazard_locations():
        """UC003 – All verified hazard locations for map markers."""
        verified = HazardStatus.query.filter_by(status_name="verified").first()
        if not verified:
            return [], None
        reports = (
            HazardReport.query
            .filter_by(status_id=verified.status_id, is_public=True)
            .join(HazardReport.location)
            .all()
        )
        return [
            {
                "report_id": r.report_id,
                "latitude": float(r.location.latitude),
                "longitude": float(r.location.longitude),
                "address_name": r.location.address_name,
                "state": r.location.state,
                "hazard_type": r.hazard_type.type_name if r.hazard_type else None,
                "severity_score": r.severity_score,
            }
            for r in reports
        ], None

    @staticmethod
    def get_hotspots(radius_km=1.0):
        """UC003 – Clustered hazard locations grouped roughly by state."""
        locations = db.session.query(
            Location.state,
            db.func.count(HazardReport.report_id).label("count"),
            db.func.avg(Location.latitude).label("avg_lat"),
            db.func.avg(Location.longitude).label("avg_lng"),
        ).join(HazardReport, HazardReport.location_id == Location.location_id
        ).group_by(Location.state).all()

        return [
            {
                "state": row.state,
                "count": row.count,
                "center_lat": float(row.avg_lat),
                "center_lng": float(row.avg_lng),
            }
            for row in locations
        ], None
