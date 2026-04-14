from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app(config_name="development"):
    app = Flask(__name__)

    from app.config import config
    app.config.from_object(config[config_name])

    # Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app)

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.reports import reports_bp
    from app.routes.detection import detection_bp
    from app.routes.locations import locations_bp
    from app.routes.users import users_bp
    from app.routes.admin import admin_bp

    prefix = "/api/v1"
    app.register_blueprint(auth_bp, url_prefix=f"{prefix}/auth")
    app.register_blueprint(reports_bp, url_prefix=f"{prefix}/reports")
    app.register_blueprint(detection_bp, url_prefix=f"{prefix}/detection")
    app.register_blueprint(locations_bp, url_prefix=f"{prefix}/locations")
    app.register_blueprint(users_bp, url_prefix=f"{prefix}/users")
    app.register_blueprint(admin_bp, url_prefix=f"{prefix}/admin")

    # Import models so Flask-Migrate can detect them
    from app import models  # noqa: F401

    return app
