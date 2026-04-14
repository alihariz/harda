from datetime import datetime
from app import db
from app.models.system_report import SystemReport
from app.models.hazard_report import HazardReport
from app.models.hazard_status import HazardStatus
from app.models.hazard_type import HazardType


class ReportGenerationService:

    @staticmethod
    def get_summary():
        """UC012 – Dashboard stats: totals by status and type."""
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
        return {
            "total_reports": total,
            "by_status": {row[0]: row[1] for row in by_status},
            "by_hazard_type": {row[0]: row[1] for row in by_type},
        }, None

    @staticmethod
    def generate(admin_id, data):
        """UC012 – Generate and persist an analytical report."""
        import json
        summary, _ = ReportGenerationService.get_summary()
        system_report = SystemReport(
            generated_by=admin_id,
            report_type=data.get("report_type", "summary"),
            content=json.dumps(summary),
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
