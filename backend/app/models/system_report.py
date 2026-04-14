from datetime import datetime, date
from app import db


class SystemReport(db.Model):
    """Admin-generated analytical reports. UC012."""

    __tablename__ = "system_reports"

    report_id = db.Column(db.Integer, primary_key=True)
    generated_by = db.Column(db.Integer, db.ForeignKey("admins.admin_id"), nullable=False)
    report_type = db.Column(db.String(80), nullable=False)
    generated_date = db.Column(db.DateTime, default=datetime.utcnow)
    content = db.Column(db.Text)  # JSON analytics payload
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    file_path = db.Column(db.String(255))  # exported file (CSV/PDF)

    generated_by_admin = db.relationship("Admin", back_populates="system_reports")

    def to_dict(self):
        return {
            "report_id": self.report_id,
            "generated_by": self.generated_by,
            "report_type": self.report_type,
            "generated_date": self.generated_date.isoformat() if self.generated_date else None,
            "content": self.content,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "file_path": self.file_path,
        }
