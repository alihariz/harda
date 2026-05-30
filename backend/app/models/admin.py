from datetime import datetime
from app import db


class Admin(db.Model):
    __tablename__ = "admins"

    admin_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    reports_validated = db.relationship(
        "HazardReport",
        back_populates="admin",
        lazy="dynamic",
        foreign_keys="HazardReport.admin_id",
    )
    system_reports = db.relationship("SystemReport", back_populates="generated_by_admin", lazy="dynamic")
    led_teams = db.relationship("Team", back_populates="lead_admin", lazy="dynamic")

    def to_dict(self):
        return {
            "admin_id": self.admin_id,
            "username": self.username,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "created_date": self.created_date.isoformat() if self.created_date else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "is_active": self.is_active,
        }
