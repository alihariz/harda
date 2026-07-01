import bcrypt
from datetime import datetime
from app import db
from app.models.user import User
from app.models.admin import Admin
from app.models.hazard_report import HazardReport


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

    @staticmethod
    def delete_user(user_id):
        """Hard-delete a user or crew member. Nullifies their FK references first."""
        user = db.session.get(User, user_id)
        if not user:
            return None, "User not found"
        from app.models.hazard_image import HazardImage
        HazardReport.query.filter_by(user_id=user_id).update({"user_id": None})
        HazardImage.query.filter_by(uploaded_by_user_id=user_id).update({"uploaded_by_user_id": None})
        db.session.delete(user)
        db.session.commit()
        return {"deleted_user_id": user_id}, None

    # ── Admin management ─────────────────────────────────────────────────────

    @staticmethod
    def list_admins():
        return [a.to_dict() for a in Admin.query.order_by(Admin.created_date.desc()).all()], None

    @staticmethod
    def create_admin(data):
        """UC007 extension — Admin creates another admin account."""
        required = ("username", "email", "password")
        for field in required:
            if not data.get(field):
                return None, f"'{field}' is required"
        if Admin.query.filter_by(email=data["email"]).first():
            return None, "Email already in use"
        if Admin.query.filter_by(username=data["username"]).first():
            return None, "Username already taken"
        password_hash = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt()).decode()
        admin = Admin(
            username=data["username"],
            email=data["email"],
            password_hash=password_hash,
            first_name=data.get("first_name"),
            last_name=data.get("last_name"),
            created_date=datetime.utcnow(),
            is_active=True,
        )
        db.session.add(admin)
        db.session.commit()
        return admin.to_dict(), None

    @staticmethod
    def delete_admin(admin_id, requesting_admin_id):
        """Hard-delete an admin. Blocks self-deletion. Nullifies FK references first."""
        if int(admin_id) == int(requesting_admin_id):
            return None, "You cannot delete your own account"
        admin = db.session.get(Admin, admin_id)
        if not admin:
            return None, "Admin not found"
        if Admin.query.filter_by(is_active=True).count() <= 1:
            return None, "Cannot delete the last active admin account"
        from app.models.system_report import SystemReport
        from app.models.team import Team
        HazardReport.query.filter_by(admin_id=admin_id).update({"admin_id": None})
        HazardReport.query.filter_by(archived_by=admin_id).update({"archived_by": None})
        SystemReport.query.filter_by(generated_by=admin_id).update({"generated_by": None})
        Team.query.filter_by(lead_admin_id=admin_id).update({"lead_admin_id": None})
        db.session.delete(admin)
        db.session.commit()
        return {"deleted_admin_id": admin_id}, None

    # ── Crew management ──────────────────────────────────────────────────────

    @staticmethod
    def list_crew():
        crew = User.query.filter_by(role="crew").order_by(User.created_date.desc()).all()
        return [u.to_dict() for u in crew], None

    @staticmethod
    def create_crew(data):
        """UC007 extension — Admin creates a crew account linked to a team."""
        required = ("username", "email", "password", "team_id")
        for field in required:
            if not data.get(field) and data.get(field) != 0:
                return None, f"'{field}' is required"
        from app.models.team import Team
        team = db.session.get(Team, int(data["team_id"]))
        if not team:
            return None, "Team not found"
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
            role="crew",
            team_id=int(data["team_id"]),
            created_date=datetime.utcnow(),
            is_active=True,
        )
        db.session.add(user)
        db.session.commit()
        return user.to_dict(), None
