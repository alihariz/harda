from app import db


class Location(db.Model):
    __tablename__ = "locations"

    location_id = db.Column(db.Integer, primary_key=True)
    latitude = db.Column(db.Numeric(10, 8), nullable=False)
    longitude = db.Column(db.Numeric(11, 8), nullable=False)
    address_name = db.Column(db.String(255))
    state = db.Column(db.String(50))
    postal_code = db.Column(db.String(10))
    country = db.Column(db.String(50), default="Malaysia")
    accuracy = db.Column(db.Numeric(8, 2))  # metres

    reports = db.relationship("HazardReport", back_populates="location", lazy="dynamic")

    def to_dict(self):
        return {
            "location_id": self.location_id,
            "latitude": float(self.latitude),
            "longitude": float(self.longitude),
            "address_name": self.address_name,
            "state": self.state,
            "postal_code": self.postal_code,
            "country": self.country,
            "accuracy": float(self.accuracy) if self.accuracy else None,
        }
