from datetime import datetime
from app import db


class HazardImage(db.Model):
    """Uploaded image linked to a hazard report. UC001."""

    __tablename__ = "hazard_images"

    image_id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey("hazard_reports.report_id"), nullable=False)
    # Storage path convention: uploads/{year}/{month}/{report_id}_{timestamp}.jpg
    file_path = db.Column(db.String(255), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer)  # bytes
    mime_type = db.Column(db.String(50))  # 'image/jpeg' or 'image/png'
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    is_primary = db.Column(db.Boolean, default=False)
    # Progress 2: 'after' photos uploaded by field crew once a hazard is repaired.
    # Counter-feature to Roadcare's lost-history problem flagged by Sufie.
    is_resolution_photo = db.Column(db.Boolean, default=False, nullable=False)
    # Optional FK back to the user who uploaded the resolution photo (field crew).
    uploaded_by_user_id = db.Column(
        db.Integer, db.ForeignKey("users.user_id"), nullable=True
    )

    report = db.relationship("HazardReport", back_populates="images")
    uploaded_by = db.relationship("User", foreign_keys=[uploaded_by_user_id])

    def to_dict(self):
        return {
            "image_id": self.image_id,
            "report_id": self.report_id,
            "file_path": self.file_path,
            "file_name": self.file_name,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "upload_date": self.upload_date.isoformat() if self.upload_date else None,
            "is_primary": self.is_primary,
            "is_resolution_photo": self.is_resolution_photo,
            "uploaded_by_user_id": self.uploaded_by_user_id,
        }
