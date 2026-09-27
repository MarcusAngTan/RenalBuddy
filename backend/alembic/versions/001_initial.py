"""Initial RenalBuddy tables."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "patient_profiles",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("last_appointment_on", sa.Date(), nullable=True),
        sa.Column("next_appointment_on", sa.Date(), nullable=True),
        sa.Column("coping_interests", sa.JSON(), nullable=True),
        sa.Column("disclaimer_accepted_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "medications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("dose_amount", sa.Numeric(8, 2), nullable=False),
        sa.Column("dose_unit", sa.String(32), nullable=False),
        sa.Column("schedule", sa.String(32), nullable=False),
        sa.Column("is_steroid", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("started_on", sa.Date(), nullable=False),
        sa.Column("stopped_on", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_meds_user", "medications", ["user_id", "status"])
    op.create_table(
        "medication_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("medication_id", sa.Integer(), sa.ForeignKey("medications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(32), nullable=False),
        sa.Column("dose_amount", sa.Numeric(8, 2), nullable=False),
        sa.Column("dose_unit", sa.String(32), nullable=False),
        sa.Column("event_on", sa.Date(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_med_events_user_day", "medication_events", ["user_id", "event_on"])
    op.create_table(
        "taper_plans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("medication_name", sa.String(120), nullable=False),
        sa.Column("dose_unit", sa.String(32), nullable=False),
        sa.Column("prescribed_note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_taper_user_status", "taper_plans", ["user_id", "status"])
    op.create_table(
        "taper_steps",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("plan_id", sa.Integer(), sa.ForeignKey("taper_plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("step_number", sa.Integer(), nullable=False),
        sa.Column("dose_amount", sa.Numeric(8, 2), nullable=False),
        sa.Column("start_on", sa.Date(), nullable=False),
        sa.Column("end_on", sa.Date(), nullable=False),
        sa.Column("instruction", sa.Text(), nullable=True),
    )
    op.create_index("ix_taper_steps_plan", "taper_steps", ["plan_id", "step_number"])
    op.create_table(
        "dose_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("log_on", sa.Date(), nullable=False),
        sa.Column("medication_id", sa.Integer(), sa.ForeignKey("medications.id"), nullable=True),
        sa.Column("taper_step_id", sa.Integer(), sa.ForeignKey("taper_steps.id"), nullable=True),
        sa.Column("slot", sa.String(16), nullable=False),
        sa.Column("prescribed_dose", sa.Numeric(8, 2), nullable=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("taken_dose", sa.Numeric(8, 2), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("logged_at", sa.DateTime(), nullable=False),
        sa.Column("source_key", sa.String(64), nullable=False),
        sa.UniqueConstraint("user_id", "log_on", "source_key", name="uq_dose_day_source"),
    )
    op.create_index("ix_dose_user_day", "dose_logs", ["user_id", "log_on"])
    op.create_table(
        "side_effect_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("log_on", sa.Date(), nullable=False),
        sa.Column("effect_code", sa.String(32), nullable=False),
        sa.Column("severity", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.UniqueConstraint("user_id", "log_on", "effect_code", name="uq_effect_day"),
    )
    op.create_index("ix_effect_user_day", "side_effect_logs", ["user_id", "log_on"])
    op.create_table(
        "dipstick_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("logged_at", sa.DateTime(), nullable=False),
        sa.Column("result", sa.String(16), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
    )
    op.create_index("ix_dip_user_time", "dipstick_logs", ["user_id", "logged_at"])
    op.create_table(
        "body_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("log_on", sa.Date(), nullable=False),
        sa.Column("weight_kg", sa.Numeric(5, 2), nullable=True),
        sa.Column("oedema_score", sa.Integer(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.UniqueConstraint("user_id", "log_on", name="uq_body_day"),
    )
    op.create_table(
        "wellbeing_checkins",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("log_on", sa.Date(), nullable=False),
        sa.Column("mood", sa.Integer(), nullable=False),
        sa.Column("energy", sa.Integer(), nullable=False),
        sa.Column("sleep_quality", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.UniqueConstraint("user_id", "log_on", name="uq_wellbeing_day"),
    )
    op.create_table(
        "journal_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("include_in_summary", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_journal_user_time", "journal_entries", ["user_id", "created_at"])
    op.create_table(
        "doctor_questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("discussed_on", sa.Date(), nullable=True),
    )
    op.create_index("ix_questions_user", "doctor_questions", ["user_id", "status"])
    op.create_table(
        "support_resources",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
    )
    op.create_table(
        "visit_summaries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("summary_text", sa.Text(), nullable=False),
        sa.Column("summary_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_summaries_user", "visit_summaries", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_table("visit_summaries")
    op.drop_table("support_resources")
    op.drop_table("doctor_questions")
    op.drop_table("journal_entries")
    op.drop_table("wellbeing_checkins")
    op.drop_table("body_logs")
    op.drop_table("dipstick_logs")
    op.drop_table("side_effect_logs")
    op.drop_table("dose_logs")
    op.drop_table("taper_steps")
    op.drop_table("taper_plans")
    op.drop_table("medication_events")
    op.drop_table("medications")
    op.drop_table("patient_profiles")
    op.drop_table("users")
