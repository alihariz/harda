"""
seeds.py — populate the database with baseline data.

Run from the backend/ directory:
    python seeds.py

Idempotent: skips rows that already exist (matched by unique key).
"""

import os
import sys
import bcrypt
from datetime import datetime


def seed():
    from app import create_app, db
    from app.models.user import User
    from app.models.admin import Admin
    from app.models.hazard_type import HazardType
    from app.models.hazard_status import HazardStatus

    app = create_app(os.getenv("FLASK_ENV", "development"))

    with app.app_context():
        # ── 1. Admin user ────────────────────────────────────────────────────
        admin_data = {
            "username": "admin",
            "email": "admin@harda.my",
            "password": "Admin123!",
            "first_name": "HARDA",
            "last_name": "Admin",
        }
        if not Admin.query.filter_by(email=admin_data["email"]).first():
            pw_hash = bcrypt.hashpw(admin_data["password"].encode(), bcrypt.gensalt()).decode()
            admin = Admin(
                username=admin_data["username"],
                email=admin_data["email"],
                password_hash=pw_hash,
                first_name=admin_data["first_name"],
                last_name=admin_data["last_name"],
                created_date=datetime.utcnow(),
                is_active=True,
            )
            db.session.add(admin)
            print(f"  [+] Admin created: {admin_data['email']}")
        else:
            print(f"  [=] Admin already exists: {admin_data['email']}")

        # ── 2. Regular user ──────────────────────────────────────────────────
        user_data = {
            "username": "testuser",
            "email": "user@harda.my",
            "password": "User123!",
            "first_name": "Test",
            "last_name": "User",
        }
        if not User.query.filter_by(email=user_data["email"]).first():
            pw_hash = bcrypt.hashpw(user_data["password"].encode(), bcrypt.gensalt()).decode()
            user = User(
                username=user_data["username"],
                email=user_data["email"],
                password_hash=pw_hash,
                first_name=user_data["first_name"],
                last_name=user_data["last_name"],
                created_date=datetime.utcnow(),
                is_active=True,
            )
            db.session.add(user)
            print(f"  [+] User created: {user_data['email']}")
        else:
            print(f"  [=] User already exists: {user_data['email']}")

        # ── 3. Hazard types ──────────────────────────────────────────────────
        hazard_types = [
            {
                "type_name": "pothole",
                "description": "Depression or hole in the road surface caused by wear and weathering.",
                "icon_path": "icons/pothole.svg",
                "default_severity": 3,
            },
            {
                "type_name": "faded_lane_marking",
                "description": "Lane markings that are worn, faded, or no longer clearly visible.",
                "icon_path": "icons/faded_lane_marking.svg",
                "default_severity": 2,
            },
            {
                "type_name": "uneven_surface",
                "description": "Road surface that is uneven, cracked, or has significant bumps.",
                "icon_path": "icons/uneven_surface.svg",
                "default_severity": 2,
            },
        ]
        for ht in hazard_types:
            if not HazardType.query.filter_by(type_name=ht["type_name"]).first():
                db.session.add(HazardType(**ht))
                print(f"  [+] HazardType created: {ht['type_name']}")
            else:
                print(f"  [=] HazardType already exists: {ht['type_name']}")

        # ── 4. Hazard statuses ───────────────────────────────────────────────
        # Status flow: submitted → verified → in_progress → resolved
        # Admin can move any report to 'rejected'
        hazard_statuses = [
            {"status_name": "submitted",   "description": "Report submitted by user, awaiting admin review."},
            {"status_name": "verified",    "description": "Report verified by admin, hazard confirmed."},
            {"status_name": "in_progress", "description": "Repair or maintenance work is underway."},
            {"status_name": "resolved",    "description": "Hazard has been repaired and the issue is closed."},
            {"status_name": "rejected",    "description": "Report rejected by admin (duplicate, invalid, or insufficient evidence)."},
        ]
        for hs in hazard_statuses:
            if not HazardStatus.query.filter_by(status_name=hs["status_name"]).first():
                db.session.add(HazardStatus(**hs))
                print(f"  [+] HazardStatus created: {hs['status_name']}")
            else:
                print(f"  [=] HazardStatus already exists: {hs['status_name']}")

        db.session.commit()
        print("\nSeeding complete.")


def seed_demo_reports():
    """Seed 15 verified hazard reports spread across Malaysia for demo/map purposes."""
    from app import create_app, db
    from app.models.hazard_type import HazardType
    from app.models.hazard_status import HazardStatus
    from app.models.hazard_report import HazardReport
    from app.models.location import Location

    app = create_app(os.getenv("FLASK_ENV", "development"))

    DEMO_REPORTS = [
        # ── Kuala Lumpur (6) ──────────────────────────────────────────────────
        {
            "lat": 3.1412, "lng": 101.6865,
            "address_name": "Jalan Bukit Bintang, Bukit Bintang",
            "state": "Kuala Lumpur", "postal_code": "55100",
            "hazard_type": "pothole", "severity": 4,
            "title": "Large pothole near Pavilion entrance",
            "description": "Deep pothole causing traffic obstruction near the main roundabout.",
        },
        {
            "lat": 3.1478, "lng": 101.6953,
            "address_name": "Jalan Ampang, Ampang",
            "state": "Kuala Lumpur", "postal_code": "50450",
            "hazard_type": "faded_lane_marking", "severity": 2,
            "title": "Faded lane markings along Jalan Ampang",
            "description": "Centre lane markings barely visible after heavy rainfall season.",
        },
        {
            "lat": 3.1319, "lng": 101.6841,
            "address_name": "Jalan Imbi, Imbi",
            "state": "Kuala Lumpur", "postal_code": "55100",
            "hazard_type": "uneven_surface", "severity": 3,
            "title": "Uneven road surface after pipe repair",
            "description": "Road resurfaced unevenly following utility works last month.",
        },
        {
            "lat": 3.1588, "lng": 101.7123,
            "address_name": "Jalan Cheras, Cheras",
            "state": "Kuala Lumpur", "postal_code": "56000",
            "hazard_type": "pothole", "severity": 3,
            "title": "Multiple potholes near Cheras flyover",
            "description": "Cluster of potholes at the base of the Cheras elevated highway ramp.",
        },
        {
            "lat": 3.1264, "lng": 101.7056,
            "address_name": "Jalan Syed Putra, Brickfields",
            "state": "Kuala Lumpur", "postal_code": "50470",
            "hazard_type": "faded_lane_marking", "severity": 2,
            "title": "Pedestrian crossing markings faded",
            "description": "Zebra crossing outside KL Sentral barely visible, safety risk.",
        },
        {
            "lat": 3.1705, "lng": 101.7031,
            "address_name": "Jalan Sultan Ismail, KLCC",
            "state": "Kuala Lumpur", "postal_code": "50250",
            "hazard_type": "uneven_surface", "severity": 2,
            "title": "Uneven patching near KLCC underpass",
            "description": "Patch repairs have created a noticeable bump affecting motorcycles.",
        },
        # ── Johor Bahru (4) ───────────────────────────────────────────────────
        {
            "lat": 1.4871, "lng": 103.7559,
            "address_name": "Jalan Wong Ah Fook, Bandar Johor Bahru",
            "state": "Johor", "postal_code": "80000",
            "hazard_type": "pothole", "severity": 4,
            "title": "Severe pothole on main JB commercial street",
            "description": "Deep pothole next to bus stop causing vehicle damage.",
        },
        {
            "lat": 1.4993, "lng": 103.7389,
            "address_name": "Jalan Skudai, Skudai",
            "state": "Johor", "postal_code": "81300",
            "hazard_type": "faded_lane_marking", "severity": 3,
            "title": "Highway markings faded on Jalan Skudai",
            "description": "Lane dividers worn away on high-traffic stretch toward UTM.",
        },
        {
            "lat": 1.5124, "lng": 103.7621,
            "address_name": "Jalan Tebrau, Taman Pelangi",
            "state": "Johor", "postal_code": "80400",
            "hazard_type": "uneven_surface", "severity": 3,
            "title": "Sunken road surface near Tebrau interchange",
            "description": "Subsidence visible on left lane, causing vehicles to swerve.",
        },
        {
            "lat": 1.4755, "lng": 103.7284,
            "address_name": "Jalan Dato Sulaiman, Taman Century",
            "state": "Johor", "postal_code": "80250",
            "hazard_type": "pothole", "severity": 5,
            "title": "Critical pothole — risk of tyre blowout",
            "description": "Very deep pothole reported by multiple road users. Requires urgent patching.",
        },
        # ── Penang (3) ────────────────────────────────────────────────────────
        {
            "lat": 5.4193, "lng": 100.3362,
            "address_name": "Jalan Penang, Georgetown",
            "state": "Pulau Pinang", "postal_code": "10000",
            "hazard_type": "pothole", "severity": 3,
            "title": "Pothole near Georgetown heritage zone",
            "description": "Pothole at road junction, worsened by monsoon drainage overflow.",
        },
        {
            "lat": 5.3987, "lng": 100.3174,
            "address_name": "Jalan Udini, Jelutong",
            "state": "Pulau Pinang", "postal_code": "11600",
            "hazard_type": "faded_lane_marking", "severity": 2,
            "title": "Faded markings at busy Jelutong junction",
            "description": "Stop line and lane arrows completely worn off, causing confusion.",
        },
        {
            "lat": 5.4312, "lng": 100.3501,
            "address_name": "Jalan Macalister, Georgetown",
            "state": "Pulau Pinang", "postal_code": "10400",
            "hazard_type": "uneven_surface", "severity": 2,
            "title": "Uneven tarmac near Macalister Road school",
            "description": "Road surface lifted near tree roots outside school entrance.",
        },
        # ── Putrajaya (2) ─────────────────────────────────────────────────────
        {
            "lat": 2.9362, "lng": 101.6901,
            "address_name": "Persiaran Perdana, Presint 1",
            "state": "Putrajaya", "postal_code": "62000",
            "hazard_type": "faded_lane_marking", "severity": 2,
            "title": "Faded markings on Persiaran Perdana boulevard",
            "description": "Lane markings faded on the ceremonial boulevard near government offices.",
        },
        {
            "lat": 2.9187, "lng": 101.7024,
            "address_name": "Jalan P8, Presint 8",
            "state": "Putrajaya", "postal_code": "62250",
            "hazard_type": "pothole", "severity": 3,
            "title": "Pothole forming near Presint 8 roundabout",
            "description": "Early-stage pothole at roundabout entry, likely to worsen without repair.",
        },
    ]

    with app.app_context():
        verified_status = HazardStatus.query.filter_by(status_name="verified").first()
        if not verified_status:
            print("  [!] 'verified' status not found — run seed() first.")
            return

        existing_count = HazardReport.query.filter_by(admin_id=1).count()
        if existing_count >= 15:
            print(f"  [=] Demo reports already seeded ({existing_count} admin-validated reports found). Skipping.")
            return

        now = datetime.utcnow()
        created = 0
        for i, r in enumerate(DEMO_REPORTS):
            hazard_type = HazardType.query.filter_by(type_name=r["hazard_type"]).first()
            if not hazard_type:
                print(f"  [!] HazardType '{r['hazard_type']}' not found — skipping report {i+1}.")
                continue

            location = Location(
                latitude=r["lat"],
                longitude=r["lng"],
                address_name=r["address_name"],
                state=r["state"],
                postal_code=r["postal_code"],
                country="Malaysia",
            )
            db.session.add(location)
            db.session.flush()

            # Backdate reports across the last 30 days for realistic spread
            days_ago = (len(DEMO_REPORTS) - i) * 2
            report_date = datetime(now.year, now.month, now.day) - __import__("datetime").timedelta(days=days_ago)

            report = HazardReport(
                user_id=None,
                location_id=location.location_id,
                hazard_type_id=hazard_type.hazard_type_id,
                status_id=verified_status.status_id,
                admin_id=1,
                title=r["title"],
                description=r["description"],
                severity_score=r["severity"],
                report_date=report_date,
                validation_date=report_date + __import__("datetime").timedelta(hours=6),
                is_public=True,
            )
            db.session.add(report)
            created += 1
            print(f"  [+] {r['state']:15s} | {r['hazard_type']:20s} | sev {r['severity']} | {r['title'][:45]}")

        db.session.commit()
        print(f"\n  Demo seeding complete — {created} verified reports added.")


if __name__ == "__main__":
    import sys
    print("Running HARDA seed script...")
    if "demo" in sys.argv:
        seed_demo_reports()
    else:
        seed()
        if "--with-demo" in sys.argv:
            seed_demo_reports()
