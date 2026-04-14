from app import db


class HazardType(db.Model):
    __tablename__ = "hazard_types"

    hazard_type_id = db.Column(db.Integer, primary_key=True)
    type_name = db.Column(db.String(50), nullable=False)  # e.g. 'pothole', 'faded_lane', 'uneven_surface'
    description = db.Column(db.String(255))
    icon_path = db.Column(db.String(255))
    default_severity = db.Column(db.Integer)  # 1-5

    reports = db.relationship("HazardReport", back_populates="hazard_type", lazy="dynamic")

    def to_dict(self):
        return {
            "hazard_type_id": self.hazard_type_id,
            "type_name": self.type_name,
            "description": self.description,
            "icon_path": self.icon_path,
            "default_severity": self.default_severity,
        }
