from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    last_appointment_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    next_appointment_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    coping_interests: Mapped[list | None] = mapped_column(JSON, nullable=True)
    disclaimer_accepted_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class Medication(Base):
    __tablename__ = "medications"
    __table_args__ = (Index("ix_meds_user", "user_id", "status"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    dose_amount: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    dose_unit: Mapped[str] = mapped_column(String(32), nullable=False)
    schedule: Mapped[str] = mapped_column(String(32), nullable=False)
    is_steroid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")
    started_on: Mapped[date] = mapped_column(Date, nullable=False)
    stopped_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class MedicationEvent(Base):
    __tablename__ = "medication_events"
    __table_args__ = (Index("ix_med_events_user_day", "user_id", "event_on"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    medication_id: Mapped[int] = mapped_column(ForeignKey("medications.id", ondelete="CASCADE"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)
    dose_amount: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    dose_unit: Mapped[str] = mapped_column(String(32), nullable=False)
    event_on: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class TaperPlan(Base):
    __tablename__ = "taper_plans"
    __table_args__ = (Index("ix_taper_user_status", "user_id", "status"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    medication_name: Mapped[str] = mapped_column(String(120), nullable=False)
    dose_unit: Mapped[str] = mapped_column(String(32), nullable=False)
    prescribed_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class TaperStep(Base):
    __tablename__ = "taper_steps"
    __table_args__ = (Index("ix_taper_steps_plan", "plan_id", "step_number"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("taper_plans.id", ondelete="CASCADE"), nullable=False)
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    dose_amount: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    start_on: Mapped[date] = mapped_column(Date, nullable=False)
    end_on: Mapped[date] = mapped_column(Date, nullable=False)
    instruction: Mapped[str | None] = mapped_column(Text, nullable=True)


class DoseLog(Base):
    __tablename__ = "dose_logs"
    __table_args__ = (
        UniqueConstraint("user_id", "log_on", "source_key", name="uq_dose_day_source"),
        Index("ix_dose_user_day", "user_id", "log_on"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    log_on: Mapped[date] = mapped_column(Date, nullable=False)
    medication_id: Mapped[int | None] = mapped_column(ForeignKey("medications.id"), nullable=True)
    taper_step_id: Mapped[int | None] = mapped_column(ForeignKey("taper_steps.id"), nullable=True)
    slot: Mapped[str] = mapped_column(String(16), nullable=False)
    prescribed_dose: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    taken_dose: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    logged_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    source_key: Mapped[str] = mapped_column(String(64), nullable=False)


class SideEffectLog(Base):
    __tablename__ = "side_effect_logs"
    __table_args__ = (
        UniqueConstraint("user_id", "log_on", "effect_code", name="uq_effect_day"),
        Index("ix_effect_user_day", "user_id", "log_on"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    log_on: Mapped[date] = mapped_column(Date, nullable=False)
    effect_code: Mapped[str] = mapped_column(String(32), nullable=False)
    severity: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class DipstickLog(Base):
    __tablename__ = "dipstick_logs"
    __table_args__ = (Index("ix_dip_user_time", "user_id", "logged_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    logged_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    result: Mapped[str] = mapped_column(String(16), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class BodyLog(Base):
    __tablename__ = "body_logs"
    __table_args__ = (UniqueConstraint("user_id", "log_on", name="uq_body_day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    log_on: Mapped[date] = mapped_column(Date, nullable=False)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    oedema_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class WellbeingCheckin(Base):
    __tablename__ = "wellbeing_checkins"
    __table_args__ = (UniqueConstraint("user_id", "log_on", name="uq_wellbeing_day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    log_on: Mapped[date] = mapped_column(Date, nullable=False)
    mood: Mapped[int] = mapped_column(Integer, nullable=False)
    energy: Mapped[int] = mapped_column(Integer, nullable=False)
    sleep_quality: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class JournalEntry(Base):
    __tablename__ = "journal_entries"
    __table_args__ = (Index("ix_journal_user_time", "user_id", "created_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    include_in_summary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class DoctorQuestion(Base):
    __tablename__ = "doctor_questions"
    __table_args__ = (Index("ix_questions_user", "user_id", "status"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    discussed_on: Mapped[date | None] = mapped_column(Date, nullable=True)


class SupportResource(Base):
    __tablename__ = "support_resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)


class VisitSummary(Base):
    __tablename__ = "visit_summaries"
    __table_args__ = (Index("ix_summaries_user", "user_id", "created_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    summary_text: Mapped[str] = mapped_column(Text, nullable=False)
    summary_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
