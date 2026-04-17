import os
from datetime import datetime
from app import db
from app.models.hazard_report import HazardReport
from app.models.hazard_status import HazardStatus
from app.models.hazard_image import HazardImage
from app.models.location import Location
from app.services.image_processing import ImageProcessingService
from app.services.yolo_detection import YOLODetectionService
from app.services.geolocation import GeolocationService


class HazardReportingService:

    @staticmethod
    def submit_report(request, user_id=None):
        """UC001 – Accept image upload, run YOLO, save report. Guest user_id may be None."""
        if "image" not in request.files:
            return None, "Image file is required"

        image_file = request.files["image"]
        if not image_file.filename:
            return None, "No file selected"
        if not ImageProcessingService.allowed_file(image_file.filename):
            return None, "Invalid file type. Allowed: jpg, jpeg, png"

        form = request.form

        # UC002 – Extract GPS from EXIF; fall back to form-submitted lat/lng
        lat = lng = None
        exif_result = ImageProcessingService.extract_exif_gps(image_file)
        if exif_result:
            lat, lng = exif_result  # already floats
        else:
            raw_lat = form.get("latitude")
            raw_lng = form.get("longitude")
            try:
                if raw_lat is not None and raw_lng is not None:
                    lat = float(raw_lat)
                    lng = float(raw_lng)
            except (TypeError, ValueError):
                return None, "latitude and longitude must be valid numbers"

        if lat is None or lng is None:
            return None, "Location data is required (GPS EXIF or lat/lng fields)"

        # JWT identity is stored as a string; FK column expects int or None
        uid = int(user_id) if user_id is not None else None

        try:
            # Persist location
            location = Location(
                latitude=lat,
                longitude=lng,
                address_name=form.get("address_name"),
                state=form.get("state"),
                postal_code=form.get("postal_code"),
                country=form.get("country", "Malaysia"),
                accuracy=float(form.get("accuracy")) if form.get("accuracy") else None,
            )
            db.session.add(location)
            db.session.flush()  # assigns location_id

            # Resolve 'submitted' status
            status = HazardStatus.query.filter_by(status_name="submitted").first()

            report = HazardReport(
                user_id=uid,
                location_id=location.location_id,
                status_id=status.status_id if status else 1,
                title=form.get("title", "Untitled Hazard Report"),
                description=form.get("description"),
                is_public=True,
            )
            db.session.add(report)
            db.session.flush()  # assigns report_id

            # Save image to disk (stream is seeked to 0 inside save_image)
            saved_path, file_name = ImageProcessingService.save_image(image_file, report.report_id)
            file_size = os.path.getsize(saved_path)

            image_record = HazardImage(
                report_id=report.report_id,
                file_path=saved_path,
                file_name=file_name,
                file_size=file_size,
                mime_type=image_file.mimetype or "image/jpeg",
                upload_date=datetime.utcnow(),
                is_primary=True,
            )
            db.session.add(image_record)

            # Run YOLO detection against the saved file
            detection, _ = YOLODetectionService.analyse_path(saved_path)
            if detection and not detection.get("low_confidence"):
                from app.models.hazard_type import HazardType
                hazard_type = HazardType.query.filter_by(
                    type_name=detection["hazard_type"]
                ).first()
                report.hazard_type_id = hazard_type.hazard_type_id if hazard_type else None
                report.severity_score = detection.get("severity_score")

            db.session.commit()
            return {**report.to_dict(), "detection": detection}, None

        except Exception as exc:
            db.session.rollback()
            return None, f"Failed to submit report: {str(exc)}"

    @staticmethod
    def list_reports(filters, admin_view=False):
        query = HazardReport.query
        if not admin_view:
            query = query.filter_by(is_public=True)
        if filters.get("status"):
            query = query.join(HazardReport.status).filter_by(status_name=filters["status"])
        page = query.paginate(page=filters.get("page", 1), per_page=filters.get("per_page", 20), error_out=False)
        return {
            "reports": [r.to_dict() for r in page.items],
            "total": page.total,
            "pages": page.pages,
            "page": page.page,
        }, None

    @staticmethod
    def get_map_reports():
        """UC003 – Public verified reports with lat/lng only."""
        verified = HazardStatus.query.filter_by(status_name="verified").first()
        if not verified:
            return [], None
        reports = HazardReport.query.filter_by(status_id=verified.status_id, is_public=True).all()
        return [
            {
                "report_id": r.report_id,
                "latitude": float(r.location.latitude),
                "longitude": float(r.location.longitude),
                "hazard_type": r.hazard_type.type_name if r.hazard_type else None,
                "severity_score": r.severity_score,
            }
            for r in reports if r.location
        ], None

    @staticmethod
    def get_report(report_id):
        report = db.session.get(HazardReport, report_id)
        if not report:
            return None, "Report not found"
        return report.to_dict(), None

    @staticmethod
    def get_user_reports(user_id):
        reports = HazardReport.query.filter_by(user_id=user_id).all()
        return [r.to_dict() for r in reports], None

    @staticmethod
    def get_pending_reports():
        pending = HazardStatus.query.filter_by(status_name="submitted").first()
        if not pending:
            return [], None
        reports = HazardReport.query.filter_by(status_id=pending.status_id).all()
        return [r.to_dict() for r in reports], None

    @staticmethod
    def update_status(report_id, data):
        """UC010 – One-directional status flow: submitted→verified→in_progress→resolved (or rejected)."""
        report = db.session.get(HazardReport, report_id)
        if not report:
            return None, "Report not found"
        new_status = HazardStatus.query.filter_by(status_name=data.get("status")).first()
        if not new_status:
            return None, "Invalid status"
        report.status_id = new_status.status_id
        if new_status.status_name == "resolved":
            report.resolution_date = datetime.utcnow()
        db.session.commit()
        return report.to_dict(), None

    @staticmethod
    def validate_report(report_id, admin_id, data):
        """UC009 – Admin validates; sets hazard type and moves to 'verified'."""
        report = db.session.get(HazardReport, report_id)
        if not report:
            return None, "Report not found"
        verified = HazardStatus.query.filter_by(status_name="verified").first()
        report.status_id = verified.status_id if verified else report.status_id
        report.admin_id = int(admin_id) if admin_id is not None else None
        report.validation_date = datetime.utcnow()
        if data.get("hazard_type_id"):
            report.hazard_type_id = data["hazard_type_id"]
        db.session.commit()
        return report.to_dict(), None

    @staticmethod
    def delete_report(report_id):
        report = db.session.get(HazardReport, report_id)
        if not report:
            return "Report not found"
        db.session.delete(report)
        db.session.commit()
        return None

    @staticmethod
    def bulk_action(admin_id, data):
        """UC011 – Apply action to multiple report IDs."""
        report_ids = data.get("report_ids", [])
        action = data.get("action")
        if not report_ids or not action:
            return None, "report_ids and action are required"
        status = HazardStatus.query.filter_by(status_name=action).first()
        if not status:
            return None, f"Unknown action '{action}'"
        updated = 0
        for rid in report_ids:
            report = db.session.get(HazardReport, rid)
            if report:
                report.status_id = status.status_id
                report.admin_id = int(admin_id) if admin_id is not None else None
                updated += 1
        db.session.commit()
        return {"updated": updated}, None
