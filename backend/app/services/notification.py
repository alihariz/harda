"""
Notification service (Progress 2). Emits status-change emails when a hazard
report transitions through the lifecycle. Designed as a stub: by default it
logs to stdout (DEV_NOTIFICATIONS_BACKEND=console), and can be flipped to
real SMTP by setting MAIL_SERVER + related env vars without code changes.

The thesis architecture diagram references this as NotificationService.

Wire-up points:
- HazardReportingService.validate_report  → 'verified'
- HazardReportingService.assign_team      → 'in_progress'
- HazardReportingService.upload_after_photo → 'resolved'
- HazardReportingService.update_status    → any transition
"""
from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage
from typing import Optional

logger = logging.getLogger(__name__)

SUBJECTS = {
    "submitted":   "HARDA — Your hazard report has been submitted",
    "verified":    "HARDA — Your hazard report has been verified",
    "in_progress": "HARDA — A crew has been dispatched to your hazard",
    "resolved":    "HARDA — Your reported hazard has been resolved",
    "rejected":    "HARDA — Your hazard report could not be verified",
}

BODY_TEMPLATES = {
    "submitted": (
        "Thanks for reporting hazard #{report_id} — '{title}'.\n"
        "We've received your submission and an admin will review it shortly.\n"
        "Status: SUBMITTED"
    ),
    "verified": (
        "Hazard #{report_id} — '{title}' has been verified by our admin team.\n"
        "It's now visible on the public HARDA map.\n"
        "Status: VERIFIED"
    ),
    "in_progress": (
        "Hazard #{report_id} — '{title}' has been assigned to a field-crew team{team_clause}.\n"
        "They'll attend the site and repair the hazard.\n"
        "Status: IN PROGRESS"
    ),
    "resolved": (
        "Hazard #{report_id} — '{title}' has been resolved.\n"
        "A repair-confirmation 'after' photo has been uploaded.\n"
        "Status: RESOLVED"
    ),
    "rejected": (
        "Hazard #{report_id} — '{title}' could not be verified and has been rejected.\n"
        "Reason: insufficient evidence, duplicate, or invalid submission.\n"
        "Status: REJECTED"
    ),
}


class NotificationService:
    """Status-change email notifier. Console-backed by default."""

    @staticmethod
    def _backend() -> str:
        return os.getenv("NOTIFICATION_BACKEND", "console").lower()

    @staticmethod
    def _smtp_send(to: str, subject: str, body: str) -> None:
        server = os.getenv("MAIL_SERVER")
        if not server:
            raise RuntimeError("NOTIFICATION_BACKEND=smtp but MAIL_SERVER is not set")
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = os.getenv("MAIL_FROM", "no-reply@harda.my")
        msg["To"] = to
        msg.set_content(body)

        port = int(os.getenv("MAIL_PORT", "587"))
        username = os.getenv("MAIL_USERNAME")
        password = os.getenv("MAIL_PASSWORD")
        use_tls = os.getenv("MAIL_USE_TLS", "true").lower() == "true"

        with smtplib.SMTP(server, port, timeout=10) as smtp:
            if use_tls:
                smtp.starttls()
            if username and password:
                smtp.login(username, password)
            smtp.send_message(msg)

    @classmethod
    def send_status_update(
        cls,
        recipient_email: Optional[str],
        report_id: int,
        title: str,
        new_status: str,
        *,
        team_name: Optional[str] = None,
    ) -> bool:
        """Fire-and-forget status-change email. Never raises into the caller —
        a failed email is logged but the surrounding DB transaction proceeds."""
        if not recipient_email:
            logger.info(
                "Notification skipped (no recipient): report=%s status=%s",
                report_id, new_status,
            )
            return False

        subject = SUBJECTS.get(new_status, f"HARDA — Status update on report #{report_id}")
        body_template = BODY_TEMPLATES.get(
            new_status,
            "Hazard #{report_id} — '{title}' status changed to {status}.",
        )
        body = body_template.format(
            report_id=report_id,
            title=title or "Untitled hazard",
            team_clause=f" ({team_name})" if team_name else "",
            status=new_status.upper(),
        )

        backend = cls._backend()
        try:
            if backend == "console":
                logger.info(
                    "\n──────── EMAIL (console backend) ────────\n"
                    "To:      %s\n"
                    "Subject: %s\n"
                    "%s\n"
                    "─────────────────────────────────────────",
                    recipient_email, subject, body,
                )
            elif backend == "smtp":
                cls._smtp_send(recipient_email, subject, body)
            else:
                logger.warning("Unknown NOTIFICATION_BACKEND=%r — skipping", backend)
                return False
            return True
        except Exception:
            logger.exception(
                "Failed to send notification (report=%s status=%s)",
                report_id, new_status,
            )
            return False
