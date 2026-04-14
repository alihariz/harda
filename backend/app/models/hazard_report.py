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

    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    severity_score = db.Column(db.Integer)  # 1-5, derived from YOLO confidence
    report_date = db.Column(db.DateTime, default=datetime.utcnow)
    validation_date = db.Column(db.DateTime)
    resolution_date = db.Column(db.DateTime)
    is_public = db.Column(db.Boolean, default=True, nullable=False)

    user = db.relationship("User", back_populates="reports")
    location = db.relationship("Location", back_populates="reports")
    hazard_type = db.relationship("HazardType", back_populates="reports")
    status = db.relationship("HazardStatus", back_populates="reports")
    admin = db.relationship("Admin", back_populates="reports_validated")
    images = db.relationship("HazardImage", back_populates="report", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "report_id": self.report_id,
            "user_id": self.user_id,
            "location": self.location.to_dict() if self.location else None,
            "hazard_type": self.hazard_type.to_dict() if self.hazard_type else None,
            "status": self.status.to_dict() if self.status else None,
            "admin_id": self.admin_id,
            "title": self.title,
            "description": self.description,
            "severity_score": self.severity_score,
            "report_date": self.report_date.isoformat() if self.report_date else None,
            "validation_date": self.validation_date.isoformat() if self.validation_date else None,
            "resolution_date": self.resolution_date.isoformat() if self.resolution_date else None,
            "is_public": self.is_public,
        }
