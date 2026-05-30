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
from app.services.notification import NotificationService


def _notify_status_change(report, new_status, team_name=None):
    """Helper — fire-and-forget notification on a status transition.
    Wrapped so any failure (bad SMTP config, etc.) never breaks the request."""
    try:
        recipient = None
        if report.user and report.user.email:
            recipient = report.user.email
        NotificationService.send_status_update(
            recipient_email=recipient,
            report_id=report.report_id,
            title=report.title,
            new_status=new_status,
            team_name=team_name,
        )
    except Exception:
        # Already swallowed inside NotificationService, but belt-and-braces.
        pass


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
            if detection:
                # UC009 / F2: always persist raw confidence so admin can cross-check
                report.detection_confidence = detection.get("confidence")
                report.detection_low_confidence = detection.get("low_confidence", False)
                if not detection.get("low_confidence"):
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
        # Exclude archived rows by default; public view never sees archived rows
        if not filters.get("include_archived"):
            query = query.filter(HazardReport.archived_at.is_(None))
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
        return report.to_dict(include_images=True), None

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
        _notify_status_change(report, new_status.status_name)
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
        _notify_status_change(report, "verified")
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

    # ── Progress 2: team assignment + after-photos ─────────────────────────────

    @staticmethod
    def assign_team(report_id, admin_id, team_id):
        """Progress 2 — Admin assigns a field-crew team to a verified report.
        Side-effect: status transitions to 'in_progress'. Sufie's stakeholder
        requirement: admin → field crew handoff visible in the system."""
        from app.models.team import Team
        report = db.session.get(HazardReport, report_id)
        if not report:
            return None, "Report not found"
        team = db.session.get(Team, int(team_id)) if team_id is not None else None
        if not team:
            return None, "Team not found"

        report.assigned_team_id = team.team_id
        report.assigned_at = datetime.utcnow()
        report.admin_id = int(admin_id) if admin_id is not None else report.admin_id

        in_progress = HazardStatus.query.filter_by(status_name="in_progress").first()
        if in_progress:
            report.status_id = in_progress.status_id

        db.session.commit()
        _notify_status_change(report, "in_progress", team_name=team.team_name)
        return report.to_dict(include_images=True), None

    @staticmethod
    def get_team_assignments(team_id, include_resolved=False):
        """Progress 2 — Reports assigned to a crew team. Crew mobile inbox."""
        query = HazardReport.query.filter_by(assigned_team_id=int(team_id))
        if not include_resolved:
            resolved = HazardStatus.query.filter_by(status_name="resolved").first()
            if resolved:
                query = query.filter(HazardReport.status_id != resolved.status_id)
        reports = query.order_by(HazardReport.assigned_at.desc().nullslast()).all()
        return [r.to_dict(include_images=True) for r in reports], None

    @staticmethod
    def upload_after_photo(report_id, user_id, image_file):
        """Progress 2 — Field crew uploads a post-resolution 'after' photo.
        Transitions status → resolved and sets resolution_date. Counter-feature
        to Roadcare's lost-history flaw (Sufie's stakeholder feedback)."""
        from app.models.user import User

        if not image_file or not image_file.filename:
            return None, "Image file is required"
        if not ImageProcessingService.allowed_file(image_file.filename):
            return None, "Invalid file type. Allowed: jpg, jpeg, png"

        report = db.session.get(HazardReport, report_id)
        if not report:
            return None, "Report not found"

        user = db.session.get(User, int(user_id)) if user_id is not None else None
        if not user or user.role != "crew":
            return None, "Only field-crew accounts may upload after-photos"
        if report.assigned_team_id is None or user.team_id != report.assigned_team_id:
            return None, "This report is not assigned to your team"

        try:
            saved_path, file_name = ImageProcessingService.save_image(
                image_file, report.report_id, suffix="after"
            )
            file_size = os.path.getsize(saved_path)

            after_image = HazardImage(
                report_id=report.report_id,
                file_path=saved_path,
                file_name=file_name,
                file_size=file_size,
                mime_type=image_file.mimetype or "image/jpeg",
                upload_date=datetime.utcnow(),
                is_primary=False,
                is_resolution_photo=True,
                uploaded_by_user_id=user.user_id,
            )
            db.session.add(after_image)

            resolved = HazardStatus.query.filter_by(status_name="resolved").first()
            if resolved:
                report.status_id = resolved.status_id
            report.resolution_date = datetime.utcnow()

            db.session.commit()
            _notify_status_change(report, "resolved")
            return {
                "report": report.to_dict(include_images=True),
                "after_image": after_image.to_dict(),
            }, None
        except Exception as exc:
            db.session.rollback()
            return None, f"Failed to upload after-photo: {str(exc)}"

    @staticmethod
    def admin_edit_report(report_id, admin_id, data):
        """UC011 — Admin corrects report metadata (type, severity, title, location, etc).
        Status is intentionally NOT touched here — use update_status / assign_team for that."""
        report = db.session.get(HazardReport, report_id)
        if not report:
            return None, "Report not found"

        # Hazard type
        if "hazard_type_id" in data:
            from app.models.hazard_type import HazardType
            ht_id = data["hazard_type_id"]
            if ht_id is not None:
                if not db.session.get(HazardType, int(ht_id)):
                    return None, "Invalid hazard_type_id"
                report.hazard_type_id = int(ht_id)
            else:
                report.hazard_type_id = None

        # Severity (1-5)
        if "severity_score" in data:
            sv = data["severity_score"]
            if sv is not None:
                sv = int(sv)
                if not (1 <= sv <= 5):
                    return None, "severity_score must be between 1 and 5"
                report.severity_score = sv
            else:
                report.severity_score = None

        # Simple scalar fields
        for field in ("title", "description", "is_public"):
            if field in data:
                setattr(report, field, data[field])

        # Location correction (F3 — admin can fix bad GPS)
        loc_fields = {k: data[k] for k in ("latitude", "longitude", "address_name", "state") if k in data}
        if loc_fields and report.location:
            loc = report.location
            if "latitude" in loc_fields:
                loc.latitude = float(loc_fields["latitude"])
            if "longitude" in loc_fields:
                loc.longitude = float(loc_fields["longitude"])
            if "address_name" in loc_fields:
                loc.address_name = loc_fields["address_name"]
            if "state" in loc_fields:
                loc.state = loc_fields["state"]

        report.admin_id = int(admin_id) if admin_id is not None else report.admin_id
        db.session.commit()
        return report.to_dict(include_images=True), None

    @staticmethod
    def archive_report(report_id, admin_id):
        """UC011 — Archive lifecycle: explicit admin action on a resolved/rejected report.
        Archived reports are hidden from the queue and appear in /admin/archive."""
        report = db.session.get(HazardReport, report_id)
        if not report:
            return None, "Report not found"
        if report.archived_at is not None:
            return None, "Report is already archived"
        status_name = report.status.status_name if report.status else None
        if status_name not in ("resolved", "rejected"):
            return None, "Only resolved or rejected reports can be archived"
        report.archived_at = datetime.utcnow()
        report.archived_by = int(admin_id) if admin_id is not None else None
        db.session.commit()
        return report.to_dict(include_images=True), None

    @staticmethod
    def unarchive_report(report_id):
        """UC011 — Archive lifecycle: remove from archive and restore to the queue."""
        report = db.session.get(HazardReport, report_id)
        if not report:
            return None, "Report not found"
        if report.archived_at is None:
            return None, "Report is not archived"
        report.archived_at = None
        report.archived_by = None
        db.session.commit()
        return report.to_dict(include_images=True), None

    @staticmethod
    def bulk_archive(admin_id, report_ids):
        """UC011 — Archive multiple reports; skip ineligible ones and return a summary."""
        archived = 0
        skipped = []
        now = datetime.utcnow()
        aid = int(admin_id) if admin_id is not None else None
        for rid in report_ids:
            report = db.session.get(HazardReport, rid)
            if not report:
                skipped.append({"report_id": rid, "reason": "not found"})
                continue
            if report.archived_at is not None:
                skipped.append({"report_id": rid, "reason": "already archived"})
                continue
            status_name = report.status.status_name if report.status else None
            if status_name not in ("resolved", "rejected"):
                skipped.append({"report_id": rid, "reason": f"status is {status_name or 'unknown'}"})
                continue
            report.archived_at = now
            report.archived_by = aid
            archived += 1
        db.session.commit()
        return {"archived": archived, "skipped": skipped}, None

    @staticmethod
    def get_resolved_archive(filters=None):
        """UC011 / UC012 — Explicitly archived reports (resolved + rejected).
        Semantic change from Progress 2: filter is archived_at IS NOT NULL, not status=resolved.
        Archived is an explicit admin action, separate from report status."""
        filters = filters or {}
        query = HazardReport.query.filter(HazardReport.archived_at.isnot(None))
        if filters.get("status"):
            query = query.join(
                HazardStatus, HazardReport.status_id == HazardStatus.status_id
            ).filter(HazardStatus.status_name == filters["status"])
        if filters.get("state"):
            query = query.join(
                Location, HazardReport.location_id == Location.location_id
            ).filter(Location.state == filters["state"])
        if filters.get("team_id"):
            query = query.filter(HazardReport.assigned_team_id == int(filters["team_id"]))
        reports = query.order_by(HazardReport.archived_at.desc()).all()
        return {
            "reports": [r.to_dict(include_images=True) for r in reports],
            "total": len(reports),
        }, None
