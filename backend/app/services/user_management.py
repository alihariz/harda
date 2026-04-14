import bcrypt
from datetime import datetime
from app import db
from app.models.user import User
from app.models.admin import Admin


class UserManagementService:

    @staticmethod
    def register_user(data):
        """UC006 – Register a new user."""
        required = ("username", "email", "password")
        for field in required:
            if not data.get(field):
                return None, f"'{field}' is required"

        if User.query.filter_by(email=data["email"]).first():
            return None, "Email already registered"
        if User.query.filter_by(username=data["username"]).first():
            return None, "Username already taken"

        password_hash = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt()).decode()
        user = User(
            username=data["username"],
            email=data["email"],
            password_hash=password_hash,
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            phone_number=data.get("phone_number"),
        )
        db.session.add(user)
        db.session.commit()
        return user.to_dict(), None

    @staticmethod
    def authenticate_user(email, password):
        if not email or not password:
            return None, "Email and password required"
        user = User.query.filter_by(email=email, is_active=True).first()
        if not user or not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
            return None, "Invalid credentials"
        user.last_login = datetime.utcnow()
        db.session.commit()
        return user, None

    @staticmethod
    def authenticate_admin(email, password):
        if not email or not password:
            return None, "Email and password required"
        admin = Admin.query.filter_by(email=email, is_active=True).first()
        if not admin or not bcrypt.checkpw(password.encode(), admin.password_hash.encode()):
            return None, "Invalid credentials"
        admin.last_login = datetime.utcnow()
        db.session.commit()
        return admin, None

    @staticmethod
    def get_user(user_id):
        user = db.session.get(User, user_id)
        if not user:
            return None, "User not found"
        return user.to_dict(), None

    @staticmethod
    def update_user(user_id, data):
        user = db.session.get(User, user_id)
        if not user:
            return None, "User not found"
        for field in ("first_name", "last_name", "phone_number"):
            if field in data:
                setattr(user, field, data[field])
        db.session.commit()
        return user.to_dict(), None

    @staticmethod
    def list_users():
        users = User.query.all()
        return [u.to_dict() for u in users], None

    @staticmethod
    def set_user_status(user_id, is_active):
        user = db.session.get(User, user_id)
        if not user:
            return None, "User not found"
        user.is_active = bool(is_active)
        db.session.commit()
        return user.to_dict(), None
