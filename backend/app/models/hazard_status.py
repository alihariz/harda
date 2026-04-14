from app import db


class HazardStatus(db.Model):
    __tablename__ = "hazard_statuses"

    status_id = db.Column(db.Integer, primary_key=True)
    # Valid values: 'submitted', 'verified', 'in_progress', 'resolved', 'rejected'
    # Status flow (one-directional): submitted → verified → in_progress → resolved
    # Admin can 'rejected' from any state
    status_name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(255))

    reports = db.relationship("HazardReport", back_populates="status", lazy="dynamic")

    def to_dict(self):
        return {
            "status_id": self.status_id,
            "status_name": self.status_name,
            "description": self.description,
        }
