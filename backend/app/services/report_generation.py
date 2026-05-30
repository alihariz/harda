import csv
import io
from datetime import datetime, timedelta

from app import db
from app.models.system_report import SystemReport
from app.models.hazard_report import HazardReport
from app.models.hazard_status import HazardStatus
from app.models.hazard_type import HazardType
from app.models.location import Location


class ReportGenerationService:

    @staticmethod
    def get_summary():
        """UC012 – Dashboard stats. Progress 2: real aggregates including
        weekly submission trend (last 12 weeks) and average resolution time."""
        total = HazardReport.query.count()
        by_status = (
            db.session.query(HazardStatus.status_name, db.func.count(HazardReport.report_id))
            .join(HazardReport, HazardReport.status_id == HazardStatus.status_id)
            .group_by(HazardStatus.status_name)
            .all()
        )
        by_type = (
            db.session.query(HazardType.type_name, db.func.count(HazardReport.report_id))
            .join(HazardReport, HazardReport.hazard_type_id == HazardType.hazard_type_id)
            .group_by(HazardType.type_name)
            .all()
        )

        # Weekly submission trend — last 12 weeks (Progress 2).
        now = datetime.utcnow()
        twelve_weeks_ago = now - timedelta(weeks=12)
        recent = HazardReport.query.filter(
            HazardReport.report_date >= twelve_weeks_ago
        ).all()
        trend_buckets = {}
        for r in recent:
            if not r.report_date:
                continue
            week_start = r.report_date - timedelta(days=r.report_date.weekday())
            key = week_start.strftime("%Y-%m-%d")
            trend_buckets[key] = trend_buckets.get(key, 0) + 1
        weekly_trend = sorted(
            [{"week_start": k, "count": v} for k, v in trend_buckets.items()],
            key=lambda x: x["week_start"],
        )

        # Average resolution time (Progress 2).
        resolved_reports = HazardReport.query.filter(
            HazardReport.resolution_date.isnot(None),
            HazardReport.report_date.isnot(None),
        ).all()
        if resolved_reports:
            durations = [
                (r.resolution_date - r.report_date).total_seconds() / 86400.0
                for r in resolved_reports
            ]
            avg_resolution_days = round(sum(durations) / len(durations), 2)
        else:
            avg_resolution_days = None

        # Top 5 hotspot states by report count (Progress 2).
        hotspot_rows = (
            db.session.query(Location.state, db.func.count(HazardReport.report_id))
            .join(HazardReport, HazardReport.location_id == Location.location_id)
            .filter(Location.state.isnot(None))
            .group_by(Location.state)
            .order_by(db.func.count(HazardReport.report_id).desc())
            .limit(5)
            .all()
        )

        return {
            "total_reports": total,
            "by_status": {row[0]: row[1] for row in by_status},
            "by_hazard_type": {row[0]: row[1] for row in by_type},
            "weekly_trend": weekly_trend,
            "avg_resolution_days": avg_resolution_days,
            "top_states": [{"state": s, "count": c} for s, c in hotspot_rows],
        }, None

    @staticmethod
    def generate(admin_id, data):
        """UC012 – Generate and persist an analytical report."""
        import json
        summary, _ = ReportGenerationService.get_summary()
        system_report = SystemReport(
            generated_by=admin_id,
            report_type=data.get("report_type", "summary"),
            content=json.dumps(summary, default=str),
            start_date=data.get("start_date"),
            end_date=data.get("end_date"),
        )
        db.session.add(system_report)
        db.session.commit()
        return system_report.to_dict(), None

    @staticmethod
    def list_reports():
        reports = SystemReport.query.order_by(SystemReport.generated_date.desc()).all()
        return [r.to_dict() for r in reports], None

    @staticmethod
    def export_archive_csv(filters=None):
        """Progress 2 / UC012 — Export the resolved-hazard archive as CSV.
        This is the audit-ready evidence Sufie said JKR needs but Roadcare
        loses. Returned as a string buffer; the route streams it to the client."""
        from app.services.hazard_reporting import HazardReportingService

        result, err = HazardReportingService.get_resolved_archive(filters or {})
        if err:
            return None, err

        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "report_id", "title", "hazard_type", "severity", "status",
            "state", "address", "latitude", "longitude",
            "reported_at", "validated_at", "assigned_team", "resolved_at",
            "resolution_days", "archived_at", "before_image", "after_image",
        ])
        for r in result["reports"]:
            loc = r.get("location") or {}
            haz = r.get("hazard_type") or {}
            team = r.get("assigned_team") or {}
            status_obj = r.get("status") or {}
            reported_at = r.get("report_date")
            resolved_at = r.get("resolution_date")
            resolution_days = ""
            if reported_at and resolved_at:
                try:
                    d1 = datetime.fromisoformat(reported_at)
                    d2 = datetime.fromisoformat(resolved_at)
                    resolution_days = round((d2 - d1).total_seconds() / 86400.0, 2)
                except ValueError:
                    pass
            writer.writerow([
                r.get("report_id"),
                r.get("title"),
                haz.get("type_name"),
                r.get("severity_score"),
                status_obj.get("status_name"),
                loc.get("state"),
                loc.get("address_name"),
                loc.get("latitude"),
                loc.get("longitude"),
                reported_at,
                r.get("validation_date"),
                team.get("team_name"),
                resolved_at,
                resolution_days,
                r.get("archived_at"),
                (r.get("before_image") or {}).get("file_name"),
                (r.get("after_image") or {}).get("file_name"),
            ])
        return buf.getvalue(), None
