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

    report = db.relationship("HazardReport", back_populates="images")

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
        }
