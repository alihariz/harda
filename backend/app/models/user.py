from datetime import datetime
from app import db

# Roles a user account can hold. 'user' is the public reporter (default);
# 'crew' is a field-crew member assigned to a team — they receive assignments
# in the mobile app and upload post-resolution after-photos.
USER_ROLES = ("user", "crew")


class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    phone_number = db.Column(db.String(20))
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    # Progress 2: role determines mobile app mode (public reporter vs field crew).
    role = db.Column(db.String(20), nullable=False, default="user")
    # Progress 2: field-crew members belong to a team that receives assignments.
    team_id = db.Column(db.Integer, db.ForeignKey("teams.team_id"), nullable=True)

    reports = db.relationship("HazardReport", back_populates="user", lazy="dynamic")
    team = db.relationship("Team", back_populates="members")

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "phone_number": self.phone_number,
            "created_date": self.created_date.isoformat() if self.created_date else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "is_active": self.is_active,
            "role": self.role,
            "team_id": self.team_id,
        }
