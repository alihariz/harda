import os
from dotenv import load_dotenv

load_dotenv()


class BaseConfig:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-jwt-secret")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # File upload
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads/")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 10 * 1024 * 1024))  # 10 MB
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}

    # YOLO
    YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "ml/weights/yolov8n.pt")
    YOLO_CONFIDENCE_THRESHOLD = float(os.getenv("YOLO_CONFIDENCE_THRESHOLD", 0.70))

    # Google
    GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
    GOOGLE_CLOUD_STORAGE_BUCKET = os.getenv("GOOGLE_CLOUD_STORAGE_BUCKET", "harda-images")

    # CORS (NFR6, NFR9) — comma-separated allowed origins. "*" allows any (dev default).
    # Set CORS_ORIGINS to your homelab domain(s) in production, e.g.
    #   CORS_ORIGINS=https://harda.example.com,https://www.harda.example.com
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

    # API rate limiting (NFR8) — Flask-Limiter. Limits are configurable via env so
    # they can be tuned per environment without code changes.
    RATELIMIT_ENABLED = os.getenv("RATELIMIT_ENABLED", "true").lower() in ("1", "true", "yes", "on")
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_DEFAULT = os.getenv("RATELIMIT_DEFAULT", "200 per minute")
    RATELIMIT_HEADERS_ENABLED = True
    # Per-group overrides (applied via decorators on sensitive routes)
    RATELIMIT_AUTH = os.getenv("RATELIMIT_AUTH", "10 per minute")
    RATELIMIT_DETECTION = os.getenv("RATELIMIT_DETECTION", "30 per minute")


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:password@localhost:5432/harda_db",
    )


class TestingConfig(BaseConfig):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "TEST_DATABASE_URL",
        "postgresql://postgres:password@localhost:5432/harda_test_db",
    )
    # Disable rate limiting during tests by default so it doesn't interfere with
    # the suite. The dedicated rate-limit test re-enables it on its own app.
    RATELIMIT_ENABLED = False


class ProductionConfig(BaseConfig):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")


config = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
