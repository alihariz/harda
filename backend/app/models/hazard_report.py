from datetime import datetime
from app import db


class HazardReport(db.Model):
    """Core report entity. UC001, UC004, UC005, UC008–UC011."""

    __tablename__ = "hazard_reports"

    report_id = db.Column(db.Integer, primary_key=True)
    # UC001: user_id nullable — guest submissions are allowed
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=True)
    location_id = db.Column(db.Integer, db.ForeignKey("locations.location_id"), nullable=False)
    # UC001: hazard_type_id set by YOLO detection
    hazard_type_id = db.Column(db.Integer, db.ForeignKey("hazard_types.hazard_type_id"), nullable=True)
    status_id = db.Column(db.Integer, db.ForeignKey("hazard_statuses.status_id"), nullable=False)
    # UC008: admin_id set on validation
    admin_id = db.Column(db.Integer, db.ForeignKey("admins.admin_id"), nullable=True)
    # Progress 2: team assigned to clear this hazard (Sufie's stakeholder requirement).
    # When set, status implicitly progresses to 'in_progress'.
    assigned_team_id = db.Column(db.Integer, db.ForeignKey("teams.team_id"), nullable=True)
    assigned_at = db.Column(db.DateTime, nullable=True)

    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    severity_score = db.Column(db.Integer)  # 1-5, derived from YOLO confidence
    # UC009 / F2: raw YOLO confidence persisted so admin can cross-check detection
    detection_confidence = db.Column(db.Numeric(5, 4), nullable=True)
    detection_low_confidence = db.Column(db.Boolean, nullable=True, default=False)
    report_date = db.Column(db.DateTime, default=datetime.utcnow)
    validation_date = db.Column(db.DateTime)
    resolution_date = db.Column(db.DateTime)
    is_public = db.Column(db.Boolean, default=True, nullable=False)
    # UC011 — Archive lifecycle: explicit admin action separate from status.
    # Timestamps give audit trail of who archived and when.
    archived_at = db.Column(db.DateTime, nullable=True)
    archived_by = db.Column(db.Integer, db.ForeignKey("admins.admin_id"), nullable=True)

    user = db.relationship("User", back_populates="reports")
    location = db.relationship("Location", back_populates="reports")
    hazard_type = db.relationship("HazardType", back_populates="reports")
    status = db.relationship("HazardStatus", back_populates="reports")
    admin = db.relationship("Admin", back_populates="reports_validated", foreign_keys=[admin_id])
    assigned_team = db.relationship("Team", back_populates="assigned_reports")
    images = db.relationship("HazardImage", back_populates="report", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self, include_images=False):
        out = {
            "report_id": self.report_id,
            "user_id": self.user_id,
            "location": self.location.to_dict() if self.location else None,
            "hazard_type": self.hazard_type.to_dict() if self.hazard_type else None,
            "status": self.status.to_dict() if self.status else None,
            "admin_id": self.admin_id,
            "assigned_team_id": self.assigned_team_id,
            "assigned_team": self.assigned_team.to_dict() if self.assigned_team else None,
            "assigned_at": self.assigned_at.isoformat() if self.assigned_at else None,
            "title": self.title,
            "description": self.description,
            "severity_score": self.severity_score,
            "detection_confidence": float(self.detection_confidence) if self.detection_confidence is not None else None,
            "detection_low_confidence": self.detection_low_confidence,
            "report_date": self.report_date.isoformat() if self.report_date else None,
            "validation_date": self.validation_date.isoformat() if self.validation_date else None,
            "resolution_date": self.resolution_date.isoformat() if self.resolution_date else None,
            "is_public": self.is_public,
            "archived_at": self.archived_at.isoformat() if self.archived_at else None,
            "archived_by": self.archived_by,
        }
        if include_images:
            imgs = list(self.images)
            out["images"] = [img.to_dict() for img in imgs]
            out["before_image"] = next(
                (img.to_dict() for img in imgs if not img.is_resolution_photo), None
            )
            out["after_image"] = next(
                (img.to_dict() for img in imgs if img.is_resolution_photo), None
            )
        return out
