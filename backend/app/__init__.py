import os
from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
# NFR8 — API rate limiting. Limits/storage are read from app config at init_app.
limiter = Limiter(key_func=get_remote_address)


def _cors_origins(value):
    """Parse CORS_ORIGINS config into the form flask-cors expects."""
    if not value or value.strip() == "*":
        return "*"
    return [o.strip() for o in value.split(",") if o.strip()]


def create_app(config_name="development"):
    app = Flask(__name__)

    from app.config import config
    app.config.from_object(config[config_name])

    # Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": _cors_origins(app.config.get("CORS_ORIGINS", "*"))}},
         supports_credentials=False)
    # NFR8 — rate limiting (reads RATELIMIT_* keys from config; disabled in tests)
    app.config.setdefault("RATELIMIT_DEFAULT", app.config.get("RATELIMIT_DEFAULT", "200 per minute"))
    limiter.init_app(app)

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.reports import reports_bp
    from app.routes.detection import detection_bp
    from app.routes.locations import locations_bp
    from app.routes.users import users_bp
    from app.routes.admin import admin_bp
    from app.routes.crew import crew_bp

    prefix = "/api/v1"
    app.register_blueprint(auth_bp, url_prefix=f"{prefix}/auth")
    app.register_blueprint(reports_bp, url_prefix=f"{prefix}/reports")
    app.register_blueprint(detection_bp, url_prefix=f"{prefix}/detection")
    app.register_blueprint(locations_bp, url_prefix=f"{prefix}/locations")
    app.register_blueprint(users_bp, url_prefix=f"{prefix}/users")
    app.register_blueprint(admin_bp, url_prefix=f"{prefix}/admin")
    app.register_blueprint(crew_bp, url_prefix=f"{prefix}/crew")

    # Serve uploaded hazard images at /uploads/<path>
    upload_root = os.path.abspath(app.config.get("UPLOAD_FOLDER", "uploads"))

    @app.route("/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(upload_root, filename)

    # Import models so Flask-Migrate can detect them
    from app import models  # noqa: F401

    return app
