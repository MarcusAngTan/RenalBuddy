from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.constants import DIPSTICKS, DOSE_STATUSES, EFFECTS, INTERESTS, SCHEDULES, SLOTS


def _clean(value: str) -> str:
    return value.strip()


class RegisterIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=72)
    display_name: str = Field(min_length=1, max_length=80)
    disclaimer_accepted: bool

    @field_validator("email")
    @classmethod
    def email_shape(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError("Enter a valid email.")
        return value

    @field_validator("display_name")
    @classmethod
    def name_clean(cls, value: str) -> str:
        value = _clean(value)
        if not value:
            raise ValueError("Enter your name.")
        return value


class LoginIn(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_lower(cls, value: str) -> str:
        return value.strip().lower()


class MeOut(BaseModel):
    id: int
    email: str
    display_name: str
    last_appointment_on: date | None
    next_appointment_on: date | None
    coping_interests: list[str]
    disclaimer_accepted_at: datetime
    has_clinical_data: bool


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: MeOut


class ProfilePatch(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    last_appointment_on: date | None = None
    next_appointment_on: date | None = None
    coping_interests: list[str] | None = None

    @field_validator("display_name")
    @classmethod
    def name_clean(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = _clean(value)
        if not value:
            raise ValueError("Enter your name.")
        return value

    @field_validator("coping_interests")
    @classmethod
    def interests_known(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        cleaned = []
        for item in value:
            if item not in INTERESTS:
                raise ValueError("Unknown interest.")
            if item not in cleaned:
                cleaned.append(item)
        return cleaned


class MedicationIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    dose_amount: Decimal = Field(gt=0, le=10000)
    dose_unit: str = Field(default="mg", min_length=1, max_length=32)
    schedule: Literal["daily", "twice_daily", "as_needed"]
    is_steroid: bool = False
    started_on: date | None = None
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("name", "dose_unit")
    @classmethod
    def strip_required(cls, value: str) -> str:
        value = _clean(value)
        if not value:
            raise ValueError("This field is required.")
        return value

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("schedule")
    @classmethod
    def schedule_ok(cls, value: str) -> str:
        if value not in SCHEDULES:
            raise ValueError("Choose a schedule.")
        return value


class MedicationPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    dose_amount: Decimal | None = Field(default=None, gt=0, le=10000)
    dose_unit: str | None = Field(default=None, min_length=1, max_length=32)
    schedule: Literal["daily", "twice_daily", "as_needed"] | None = None
    is_steroid: bool | None = None
    notes: str | None = Field(default=None, max_length=1000)
    status: Literal["active", "stopped"] | None = None
    stopped_on: date | None = None

    @field_validator("name", "dose_unit")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = _clean(value)
        if not value:
            raise ValueError("This field is required.")
        return value

    @field_validator("notes")
    @classmethod
    def strip_notes(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class MedicationOut(BaseModel):
    id: int
    name: str
    dose_amount: float
    dose_unit: str
    schedule: str
    is_steroid: bool
    status: str
    started_on: date
    stopped_on: date | None
    notes: str | None

    model_config = {"from_attributes": True}


class TaperStepIn(BaseModel):
    dose_amount: Decimal = Field(gt=0, le=10000)
    start_on: date
    end_on: date
    instruction: str | None = Field(default=None, max_length=500)

    @field_validator("instruction")
    @classmethod
    def strip_instruction(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class TaperCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    medication_name: str = Field(min_length=1, max_length=120)
    dose_unit: str = Field(default="mg", min_length=1, max_length=32)
    prescribed_note: str | None = Field(default=None, max_length=1000)
    steps: list[TaperStepIn] = Field(min_length=1, max_length=12)

    @field_validator("title", "medication_name", "dose_unit")
    @classmethod
    def strip_required(cls, value: str) -> str:
        value = _clean(value)
        if not value:
            raise ValueError("This field is required.")
        return value

    @field_validator("prescribed_note")
    @classmethod
    def strip_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class TaperStepOut(BaseModel):
    id: int
    step_number: int
    dose_amount: float
    start_on: date
    end_on: date
    instruction: str | None
    state: str

    model_config = {"from_attributes": True}


class TaperPlanOut(BaseModel):
    id: int
    title: str
    medication_name: str
    dose_unit: str
    prescribed_note: str | None
    status: str
    created_at: datetime
    steps: list[TaperStepOut]


class DoseIn(BaseModel):
    medication_id: int | None = None
    taper_step_id: int | None = None
    slot: Literal["daily", "morning", "evening"]
    status: Literal["taken", "missed", "different_dose"] | None = None
    taken_dose: Decimal | None = Field(default=None, gt=0, le=10000)
    note: str | None = Field(default=None, max_length=500)

    @field_validator("slot")
    @classmethod
    def slot_ok(cls, value: str) -> str:
        if value not in SLOTS:
            raise ValueError("Unknown time of day.")
        return value

    @field_validator("status")
    @classmethod
    def status_ok(cls, value: str | None) -> str | None:
        if value is not None and value not in DOSE_STATUSES:
            raise ValueError("Unknown dose status.")
        return value


class SideEffectIn(BaseModel):
    effect_code: str
    severity: int = Field(ge=1, le=3)
    note: str | None = Field(default=None, max_length=500)

    @field_validator("effect_code")
    @classmethod
    def code_ok(cls, value: str) -> str:
        if value not in EFFECTS:
            raise ValueError("Unknown side effect.")
        return value

    @field_validator("note")
    @classmethod
    def strip_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class DailyCheckIn(BaseModel):
    on: date
    doses: list[DoseIn] = Field(default_factory=list)
    dipstick_result: str | None = None
    dipstick_note: str | None = Field(default=None, max_length=500)
    weight_kg: Decimal | None = Field(default=None, ge=20, le=400)
    oedema_score: int | None = Field(default=None, ge=0, le=3)
    body_note: str | None = Field(default=None, max_length=500)
    side_effects: list[SideEffectIn] = Field(default_factory=list)
    mood: int | None = Field(default=None, ge=1, le=5)
    energy: int | None = Field(default=None, ge=1, le=5)
    sleep_quality: int | None = Field(default=None, ge=1, le=5)
    wellbeing_note: str | None = Field(default=None, max_length=500)

    @field_validator("dipstick_result")
    @classmethod
    def dip_ok(cls, value: str | None) -> str | None:
        if value is not None and value not in DIPSTICKS:
            raise ValueError("Unknown dipstick result.")
        return value


class SlotOut(BaseModel):
    slot: str
    status: str | None
    taken_dose: float | None
    prescribed_dose: float | None


class MedTodayOut(BaseModel):
    id: int
    name: str
    dose_amount: float
    dose_unit: str
    schedule: str
    is_steroid: bool
    slots: list[SlotOut]


class TodayTaperOut(BaseModel):
    plan_id: int
    title: str
    medication_name: str
    dose_unit: str
    prescribed_note: str | None
    step: TaperStepOut | None
    next_step: TaperStepOut | None
    log_status: str | None
    taken_dose: float | None
    prescribed_dose: float | None


class SideEffectOut(BaseModel):
    effect_code: str
    severity: int
    note: str | None


class TodayOut(BaseModel):
    on: date
    last_appointment_on: date | None
    next_appointment_on: date | None
    open_questions: int
    taper: TodayTaperOut | None
    medications: list[MedTodayOut]
    dipstick_result: str | None
    weight_kg: float | None
    oedema_score: int | None
    side_effects: list[SideEffectOut]
    mood: int | None
    energy: int | None
    sleep_quality: int | None
    wellbeing_note: str | None


class JournalIn(BaseModel):
    body: str = Field(min_length=1, max_length=4000)
    include_in_summary: bool = False

    @field_validator("body")
    @classmethod
    def strip_body(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Write a note first.")
        return value


class JournalPatch(BaseModel):
    body: str | None = Field(default=None, min_length=1, max_length=4000)
    include_in_summary: bool | None = None

    @field_validator("body")
    @classmethod
    def strip_body(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Write a note first.")
        return value


class JournalOut(BaseModel):
    id: int
    body: str
    include_in_summary: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class QuestionIn(BaseModel):
    body: str = Field(min_length=1, max_length=500)

    @field_validator("body")
    @classmethod
    def strip_body(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Write the question first.")
        return value


class QuestionPatch(BaseModel):
    body: str | None = Field(default=None, min_length=1, max_length=500)
    status: Literal["open", "discussed"] | None = None

    @field_validator("body")
    @classmethod
    def strip_body(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Write the question first.")
        return value


class QuestionOut(BaseModel):
    id: int
    body: str
    status: str
    created_at: datetime
    discussed_on: date | None

    model_config = {"from_attributes": True}


class ResourceOut(BaseModel):
    id: int
    title: str
    url: str
    description: str

    model_config = {"from_attributes": True}


class CopingOut(BaseModel):
    id: str
    title: str
    body: str
    tags: list[str]


class CopingListOut(BaseModel):
    suggestions: list[CopingOut]
    using_defaults: bool


class SummaryOut(BaseModel):
    id: int | None
    period_start: date
    period_end: date
    summary_text: str
    summary_json: dict
    created_at: datetime | None


class SummaryCreate(BaseModel):
    period_start: date | None = None
    period_end: date | None = None


class CloseIn(BaseModel):
    appointment_on: date | None = None
    period_start: date | None = None
    period_end: date | None = None


class CloseOut(BaseModel):
    last_appointment_on: date
    summary: SummaryOut


class DipstickOut(BaseModel):
    id: int
    logged_at: datetime
    result: str
    note: str | None

    model_config = {"from_attributes": True}


class BodyOut(BaseModel):
    id: int
    log_on: date
    weight_kg: float | None
    oedema_score: int | None
    note: str | None

    model_config = {"from_attributes": True}


class WellbeingOut(BaseModel):
    id: int
    log_on: date
    mood: int
    energy: int
    sleep_quality: int
    note: str | None

    model_config = {"from_attributes": True}


class SideEffectLogOut(BaseModel):
    id: int
    log_on: date
    effect_code: str
    severity: int
    note: str | None

    model_config = {"from_attributes": True}
