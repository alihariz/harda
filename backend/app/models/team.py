from datetime import datetime
from app import db


class Team(db.Model):
    """Field-crew team. Added in Progress 2 to support Sufie's stakeholder
    requirement: admins assign reports to teams; crew members on that team
    receive assignments via the mobile app and upload post-resolution
    'after' photos.
    """

    __tablename__ = "teams"

    team_id = db.Column(db.Integer, primary_key=True)
    team_name = db.Column(db.String(80), nullable=False, unique=True)
    # Optional admin who leads / owns this team (a supervisor at JKR side).
    lead_admin_id = db.Column(db.Integer, db.ForeignKey("admins.admin_id"), nullable=True)
    region = db.Column(db.String(80))  # e.g. "Kuala Lumpur", "Johor", "Pulau Pinang"
    description = db.Column(db.String(255))
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    lead_admin = db.relationship("Admin", back_populates="led_teams")
    members = db.relationship("User", back_populates="team", lazy="dynamic")
    assigned_reports = db.relationship(
        "HazardReport", back_populates="assigned_team", lazy="dynamic"
    )

    def to_dict(self, include_member_count=False):
        out = {
            "team_id": self.team_id,
            "team_name": self.team_name,
            "lead_admin_id": self.lead_admin_id,
            "region": self.region,
            "description": self.description,
            "created_date": self.created_date.isoformat() if self.created_date else None,
            "is_active": self.is_active,
        }
        if include_member_count:
            out["member_count"] = self.members.count()
        return out
