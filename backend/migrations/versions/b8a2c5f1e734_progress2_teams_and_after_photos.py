"""Progress 2: teams, assignment, after-photos, crew role

Adds:
- `teams` table (field-crew teams for hazard assignment)
- `users.role` ('user' default, 'crew' for field crew)
- `users.team_id` FK -> teams (which team a crew member belongs to)
- `hazard_reports.assigned_team_id` FK -> teams
- `hazard_reports.assigned_at`
- `hazard_images.is_resolution_photo` (post-resolution 'after' photos)
- `hazard_images.uploaded_by_user_id` FK -> users (who uploaded after-photo)

Motivation: Sufie Silat stakeholder feedback (2026-05-22). Roadcare loses
report history once resolved; HARDA keeps it. Field crew receive assignments
via the mobile app and upload after-photos as audit-ready proof.

Revision ID: b8a2c5f1e734
Revises: a41d1d690b69
Create Date: 2026-05-26
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b8a2c5f1e734"
down_revision = "a41d1d690b69"
branch_labels = None
depends_on = None


def upgrade():
    # ── 1. teams ──────────────────────────────────────────────────────────────
    op.create_table(
        "teams",
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("team_name", sa.String(length=80), nullable=False),
        sa.Column("lead_admin_id", sa.Integer(), nullable=True),
        sa.Column("region", sa.String(length=80), nullable=True),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("created_date", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["lead_admin_id"], ["admins.admin_id"]),
        sa.PrimaryKeyConstraint("team_id"),
        sa.UniqueConstraint("team_name"),
    )

    # ── 2. users.role + users.team_id ─────────────────────────────────────────
    with op.batch_alter_table("users") as batch:
        batch.add_column(
            sa.Column(
                "role",
                sa.String(length=20),
                nullable=False,
                server_default="user",
            )
        )
        batch.add_column(sa.Column("team_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_users_team_id_teams",
            "teams",
            ["team_id"],
            ["team_id"],
        )

    # ── 3. hazard_reports.assigned_team_id + assigned_at ──────────────────────
    with op.batch_alter_table("hazard_reports") as batch:
        batch.add_column(sa.Column("assigned_team_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("assigned_at", sa.DateTime(), nullable=True))
        batch.create_foreign_key(
            "fk_hazard_reports_assigned_team_id_teams",
            "teams",
            ["assigned_team_id"],
            ["team_id"],
        )

    # ── 4. hazard_images.is_resolution_photo + uploaded_by_user_id ────────────
    with op.batch_alter_table("hazard_images") as batch:
        batch.add_column(
            sa.Column(
                "is_resolution_photo",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
        batch.add_column(sa.Column("uploaded_by_user_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_hazard_images_uploaded_by_user_id_users",
            "users",
            ["uploaded_by_user_id"],
            ["user_id"],
        )


def downgrade():
    with op.batch_alter_table("hazard_images") as batch:
        batch.drop_constraint("fk_hazard_images_uploaded_by_user_id_users", type_="foreignkey")
        batch.drop_column("uploaded_by_user_id")
        batch.drop_column("is_resolution_photo")

    with op.batch_alter_table("hazard_reports") as batch:
        batch.drop_constraint(
            "fk_hazard_reports_assigned_team_id_teams", type_="foreignkey"
        )
        batch.drop_column("assigned_at")
        batch.drop_column("assigned_team_id")

    with op.batch_alter_table("users") as batch:
        batch.drop_constraint("fk_users_team_id_teams", type_="foreignkey")
        batch.drop_column("team_id")
        batch.drop_column("role")

    op.drop_table("teams")
