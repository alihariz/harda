"""
Pytest fixtures for the HARDA backend (Progress 2).

Strategy:
- Spin up a Flask app with the `testing` config.
- Override DB URI to in-memory SQLite so tests don't need PostgreSQL.
- Use `db.create_all()` instead of Alembic so the schema reflects the current
  models (matching what migration b8a2c5f1e734 produces in production).
- Mock YOLODetectionService.analyse_path with a deterministic stub so tests
  don't pull in torch / ultralytics for every run.
"""
import io
import os
from datetime import datetime

import bcrypt
import pytest

# Force in-memory SQLite for the whole test session before the app boots.
os.environ.setdefault("TEST_DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret")
os.environ.setdefault("NOTIFICATION_BACKEND", "console")
os.environ.setdefault("UPLOAD_FOLDER", "test_uploads/")

from app import create_app, db as _db   # noqa: E402


# ── Lifecycle fixtures ──────────────────────────────────────────────────────


@pytest.fixture(scope="session")
def app():
    app = create_app("testing")
    # Hard-pin to in-memory SQLite even if env didn't take.
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    with app.app_context():
        _db.create_all()
        _seed_lookups()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db(app):
    yield _db
    _db.session.rollback()


# ── Mock YOLO so tests don't need torch installed ───────────────────────────


@pytest.fixture(autouse=True)
def mock_yolo(monkeypatch):
    """Stub YOLODetectionService to return a deterministic pothole detection."""
    from app.services import yolo_detection

    def fake_analyse_path(image_path):
        return (
            {
                "low_confidence": False,
                "hazard_type": "pothole",
                "confidence": 0.91,
                "severity_score": 4,
                "bounding_boxes": [[10, 20, 100, 120]],
                "detections": [{
                    "hazard_type": "pothole",
                    "raw_label": "0",
                    "confidence": 0.91,
                    "bounding_box": [10, 20, 100, 120],
                }],
                "inference_ms": 137.5,
                "model_path": "pothole_yolov8s.pt",
            },
            None,
        )

    def fake_analyse(image_file):
        return fake_analyse_path("test")

    monkeypatch.setattr(
        yolo_detection.YOLODetectionService, "analyse_path",
        staticmethod(fake_analyse_path), raising=True,
    )
    monkeypatch.setattr(
        yolo_detection.YOLODetectionService, "analyse",
        staticmethod(fake_analyse), raising=True,
    )


# ── Seed helpers ────────────────────────────────────────────────────────────


def _seed_lookups():
    """Populate the lookup tables every test session needs."""
    from app.models.admin import Admin
    from app.models.hazard_status import HazardStatus
    from app.models.hazard_type import HazardType
    from app.models.team import Team
    from app.models.user import User

    # Hazard statuses
    for name in ["submitted", "verified", "in_progress", "resolved", "rejected"]:
        if not HazardStatus.query.filter_by(status_name=name).first():
            _db.session.add(HazardStatus(status_name=name, description=name))

    # Hazard types
    for tn in ["pothole", "faded_lane_marking", "uneven_surface"]:
        if not HazardType.query.filter_by(type_name=tn).first():
            _db.session.add(HazardType(type_name=tn, description=tn, default_severity=3))

    _db.session.commit()

    # Admin
    if not Admin.query.filter_by(email="admin@harda.my").first():
        _db.session.add(Admin(
            username="admin",
            email="admin@harda.my",
            password_hash=bcrypt.hashpw(b"Admin123!", bcrypt.gensalt()).decode(),
            first_name="HARDA", last_name="Admin",
            created_date=datetime.utcnow(), is_active=True,
        ))
    _db.session.commit()
    admin_row = Admin.query.filter_by(email="admin@harda.my").first()

    # Team
    team = Team.query.filter_by(team_name="KL Maintenance Crew").first()
    if not team:
        team = Team(
            team_name="KL Maintenance Crew",
            region="Kuala Lumpur",
            description="Test team",
            lead_admin_id=admin_row.admin_id,
            created_date=datetime.utcnow(), is_active=True,
        )
        _db.session.add(team)
        _db.session.commit()

    # Public user
    if not User.query.filter_by(email="user@harda.my").first():
        _db.session.add(User(
            username="testuser",
            email="user@harda.my",
            password_hash=bcrypt.hashpw(b"User123!", bcrypt.gensalt()).decode(),
            first_name="Test", last_name="User",
            role="user",
            created_date=datetime.utcnow(), is_active=True,
        ))

    # Crew user (on KL team)
    if not User.query.filter_by(email="crew_kl@harda.my").first():
        _db.session.add(User(
            username="crew_kl",
            email="crew_kl@harda.my",
            password_hash=bcrypt.hashpw(b"Crew123!", bcrypt.gensalt()).decode(),
            first_name="Aiman", last_name="Razak",
            role="crew", team_id=team.team_id,
            created_date=datetime.utcnow(), is_active=True,
        ))

    # Crew user from a DIFFERENT team (used for cross-team authz tests)
    other = Team.query.filter_by(team_name="Other Team").first()
    if not other:
        other = Team(team_name="Other Team", region="Johor",
                     created_date=datetime.utcnow(), is_active=True)
        _db.session.add(other)
        _db.session.commit()
    if not User.query.filter_by(email="crew_other@harda.my").first():
        _db.session.add(User(
            username="crew_other",
            email="crew_other@harda.my",
            password_hash=bcrypt.hashpw(b"Crew123!", bcrypt.gensalt()).decode(),
            first_name="Other", last_name="Crew",
            role="crew", team_id=other.team_id,
            created_date=datetime.utcnow(), is_active=True,
        ))

    _db.session.commit()


# ── Convenience auth helpers ────────────────────────────────────────────────


def _login(client, path, email, password):
    res = client.post(path, json={"email": email, "password": password})
    assert res.status_code == 200, res.get_json()
    return res.get_json()["data"]


@pytest.fixture
def admin_token(client):
    data = _login(client, "/api/v1/auth/admin/login", "admin@harda.my", "Admin123!")
    return data["access_token"]


@pytest.fixture
def user_token(client):
    data = _login(client, "/api/v1/auth/login", "user@harda.my", "User123!")
    return data["access_token"]


@pytest.fixture
def crew_token(client):
    """Crew member on KL Maintenance Crew."""
    data = _login(client, "/api/v1/auth/login", "crew_kl@harda.my", "Crew123!")
    return data["access_token"]


@pytest.fixture
def other_crew_token(client):
    """Crew member on a different team — used for negative authz tests."""
    data = _login(client, "/api/v1/auth/login", "crew_other@harda.my", "Crew123!")
    return data["access_token"]


# ── Sample image bytes (1x1 white JPEG) ─────────────────────────────────────


@pytest.fixture
def sample_image_bytes():
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), color="white").save(buf, format="JPEG")
    buf.seek(0)
    return buf.getvalue()


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}
