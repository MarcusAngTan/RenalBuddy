from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.constants import EFFECTS
from app.models import (
    BodyLog,
    DipstickLog,
    DoseLog,
    Medication,
    PatientProfile,
    SideEffectLog,
    TaperPlan,
    TaperStep,
    WellbeingCheckin,
    utcnow,
)
from app.schemas import DailyCheckIn


class CheckError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def slots_for(schedule: str) -> list[str]:
    if schedule == "twice_daily":
        return ["morning", "evening"]
    return ["daily"]


def source_key(medication_id: int | None, taper_step_id: int | None, slot: str) -> str:
    if medication_id is not None:
        return f"med:{medication_id}:{slot}"
    return f"taper:{taper_step_id}:{slot}"


def active_on(med: Medication, day: date) -> bool:
    if med.started_on > day:
        return False
    if med.stopped_on is not None and med.stopped_on < day:
        return False
    if med.status == "stopped" and med.stopped_on is None:
        return False
    return True


def active_plan(db: Session, user_id: int) -> TaperPlan | None:
    return (
        db.query(TaperPlan)
        .filter(TaperPlan.user_id == user_id, TaperPlan.status == "active")
        .order_by(TaperPlan.created_at.desc())
        .first()
    )


def steps_for(db: Session, plan_id: int) -> list[TaperStep]:
    return (
        db.query(TaperStep)
        .filter(TaperStep.plan_id == plan_id)
        .order_by(TaperStep.step_number)
        .all()
    )


def step_on(steps: list[TaperStep], day: date) -> TaperStep | None:
    for step in steps:
        if step.start_on <= day <= step.end_on:
            return step
    return None


def next_step_after(steps: list[TaperStep], day: date) -> TaperStep | None:
    upcoming = [step for step in steps if step.start_on > day]
    if not upcoming:
        return None
    return min(upcoming, key=lambda step: step.start_on)


def step_state(step: TaperStep, day: date) -> str:
    if step.end_on < day:
        return "done"
    if step.start_on > day:
        return "upcoming"
    return "current"


def _num(value: Decimal | None) -> float | None:
    if value is None:
        return None
    return float(value)


def _step_out(step: TaperStep | None, day: date) -> dict | None:
    if step is None:
        return None
    return {
        "id": step.id,
        "step_number": step.step_number,
        "dose_amount": float(step.dose_amount),
        "start_on": step.start_on,
        "end_on": step.end_on,
        "instruction": step.instruction,
        "state": step_state(step, day),
    }


def build_today(db: Session, user_id: int, day: date, profile: PatientProfile) -> dict:
    meds = (
        db.query(Medication)
        .filter(Medication.user_id == user_id)
        .order_by(Medication.name)
        .all()
    )
    visible = [med for med in meds if active_on(med, day)]
    dose_rows = db.query(DoseLog).filter(DoseLog.user_id == user_id, DoseLog.log_on == day).all()
    by_key = {row.source_key: row for row in dose_rows}

    medication_payload = []
    for med in visible:
        slots = []
        for slot in slots_for(med.schedule):
            row = by_key.get(source_key(med.id, None, slot))
            slots.append(
                {
                    "slot": slot,
                    "status": row.status if row else None,
                    "taken_dose": _num(row.taken_dose) if row else None,
                    "prescribed_dose": _num(row.prescribed_dose) if row else float(med.dose_amount),
                }
            )
        medication_payload.append(
            {
                "id": med.id,
                "name": med.name,
                "dose_amount": float(med.dose_amount),
                "dose_unit": med.dose_unit,
                "schedule": med.schedule,
                "is_steroid": med.is_steroid,
                "slots": slots,
            }
        )

    plan = active_plan(db, user_id)
    taper_payload = None
    if plan is not None:
        steps = steps_for(db, plan.id)
        current = step_on(steps, day)
        upcoming = next_step_after(steps, day)
        log = None
        if current is not None:
            log = by_key.get(source_key(None, current.id, "daily"))
        taper_payload = {
            "plan_id": plan.id,
            "title": plan.title,
            "medication_name": plan.medication_name,
            "dose_unit": plan.dose_unit,
            "prescribed_note": plan.prescribed_note,
            "step": _step_out(current, day),
            "next_step": _step_out(upcoming, day),
            "log_status": log.status if log else None,
            "taken_dose": _num(log.taken_dose) if log else None,
            "prescribed_dose": float(current.dose_amount) if current is not None else None,
        }

    start = datetime.combine(day, time.min)
    end = datetime.combine(day, time.max)
    dip = (
        db.query(DipstickLog)
        .filter(DipstickLog.user_id == user_id, DipstickLog.logged_at >= start, DipstickLog.logged_at <= end)
        .order_by(DipstickLog.logged_at.desc())
        .first()
    )
    body = db.query(BodyLog).filter(BodyLog.user_id == user_id, BodyLog.log_on == day).one_or_none()
    effects = (
        db.query(SideEffectLog)
        .filter(SideEffectLog.user_id == user_id, SideEffectLog.log_on == day)
        .all()
    )
    wellbeing = (
        db.query(WellbeingCheckin)
        .filter(WellbeingCheckin.user_id == user_id, WellbeingCheckin.log_on == day)
        .one_or_none()
    )
    from app.models import DoctorQuestion

    open_questions = (
        db.query(DoctorQuestion)
        .filter(DoctorQuestion.user_id == user_id, DoctorQuestion.status == "open")
        .count()
    )
    return {
        "on": day,
        "last_appointment_on": profile.last_appointment_on,
        "next_appointment_on": profile.next_appointment_on,
        "open_questions": open_questions,
        "taper": taper_payload,
        "medications": medication_payload,
        "dipstick_result": dip.result if dip else None,
        "weight_kg": _num(body.weight_kg) if body else None,
        "oedema_score": body.oedema_score if body else None,
        "side_effects": [
            {"effect_code": row.effect_code, "severity": row.severity, "note": row.note}
            for row in effects
        ],
        "mood": wellbeing.mood if wellbeing else None,
        "energy": wellbeing.energy if wellbeing else None,
        "sleep_quality": wellbeing.sleep_quality if wellbeing else None,
        "wellbeing_note": wellbeing.note if wellbeing else None,
    }


def _blank(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def save_daily_check(db: Session, user_id: int, data: DailyCheckIn) -> None:
    day = data.on
    if day > date.today() + timedelta(days=1):
        raise CheckError("That date is too far in the future.")

    try:
        for dose in data.doses:
            _save_dose(db, user_id, day, dose)
        _save_dipstick(db, user_id, day, data.dipstick_result, _blank(data.dipstick_note))
        _save_body(db, user_id, day, data.weight_kg, data.oedema_score, _blank(data.body_note))
        _save_effects(db, user_id, day, data.side_effects)
        _save_wellbeing(db, user_id, day, data.mood, data.energy, data.sleep_quality, _blank(data.wellbeing_note))
        db.commit()
    except CheckError:
        db.rollback()
        raise


def _save_dose(db: Session, user_id: int, day: date, dose) -> None:
    has_med = dose.medication_id is not None
    has_step = dose.taper_step_id is not None
    if has_med == has_step:
        raise CheckError("Each dose entry needs a medicine or a taper step.")

    if has_med:
        med = db.get(Medication, dose.medication_id)
        if med is None or med.user_id != user_id:
            raise CheckError("Medicine not found.")
        if dose.slot not in slots_for(med.schedule):
            raise CheckError("That time of day does not match the medicine schedule.")
        prescribed = med.dose_amount
        key = source_key(med.id, None, dose.slot)
        medication_id = med.id
        taper_step_id = None
    else:
        step = db.get(TaperStep, dose.taper_step_id)
        if step is None:
            raise CheckError("Taper step not found.")
        plan = db.get(TaperPlan, step.plan_id)
        if plan is None or plan.user_id != user_id or plan.status != "active":
            raise CheckError("Taper step not found.")
        covering = step_on(steps_for(db, plan.id), day)
        if covering is None or covering.id != step.id:
            raise CheckError("That taper step is not the prescribed step for this date.")
        if dose.slot != "daily":
            raise CheckError("The taper is logged once a day.")
        prescribed = step.dose_amount
        key = source_key(None, step.id, dose.slot)
        medication_id = None
        taper_step_id = step.id

    existing = (
        db.query(DoseLog)
        .filter(DoseLog.user_id == user_id, DoseLog.log_on == day, DoseLog.source_key == key)
        .one_or_none()
    )
    if dose.status is None:
        if existing is not None:
            db.delete(existing)
        return
    if dose.status == "different_dose":
        if dose.taken_dose is None:
            raise CheckError("Enter the amount that was taken.")
        taken = dose.taken_dose
    elif dose.status == "taken":
        taken = prescribed
    else:
        taken = None

    if existing is None:
        db.add(
            DoseLog(
                user_id=user_id,
                log_on=day,
                medication_id=medication_id,
                taper_step_id=taper_step_id,
                slot=dose.slot,
                prescribed_dose=prescribed,
                status=dose.status,
                taken_dose=taken,
                note=_blank(dose.note),
                logged_at=utcnow(),
                source_key=key,
            )
        )
    else:
        existing.prescribed_dose = prescribed
        existing.status = dose.status
        existing.taken_dose = taken
        existing.note = _blank(dose.note)
        existing.logged_at = utcnow()


def _save_dipstick(db: Session, user_id: int, day: date, result: str | None, note: str | None) -> None:
    start = datetime.combine(day, time.min)
    end = datetime.combine(day, time.max)
    rows = (
        db.query(DipstickLog)
        .filter(DipstickLog.user_id == user_id, DipstickLog.logged_at >= start, DipstickLog.logged_at <= end)
        .all()
    )
    if result is None:
        for row in rows:
            db.delete(row)
        return
    if rows:
        rows[0].result = result
        rows[0].note = note
        rows[0].logged_at = datetime.combine(day, time(8, 0))
        for extra in rows[1:]:
            db.delete(extra)
        return
    db.add(
        DipstickLog(
            user_id=user_id,
            logged_at=datetime.combine(day, time(8, 0)),
            result=result,
            note=note,
        )
    )


def _save_body(db: Session, user_id: int, day: date, weight, oedema, note: str | None) -> None:
    existing = db.query(BodyLog).filter(BodyLog.user_id == user_id, BodyLog.log_on == day).one_or_none()
    if weight is None and oedema is None and note is None:
        if existing is not None:
            db.delete(existing)
        return
    if existing is None:
        db.add(
            BodyLog(
                user_id=user_id,
                log_on=day,
                weight_kg=weight,
                oedema_score=oedema,
                note=note,
            )
        )
        return
    existing.weight_kg = weight
    existing.oedema_score = oedema
    existing.note = note


def _save_effects(db: Session, user_id: int, day: date, effects) -> None:
    db.query(SideEffectLog).filter(SideEffectLog.user_id == user_id, SideEffectLog.log_on == day).delete(
        synchronize_session=False
    )
    db.flush()
    seen = set()
    for effect in effects:
        if effect.effect_code not in EFFECTS:
            raise CheckError("Unknown side effect.")
        if effect.effect_code in seen:
            raise CheckError("Each side effect can be logged once a day.")
        seen.add(effect.effect_code)
        db.add(
            SideEffectLog(
                user_id=user_id,
                log_on=day,
                effect_code=effect.effect_code,
                severity=effect.severity,
                note=effect.note,
            )
        )


def _save_wellbeing(db: Session, user_id: int, day: date, mood, energy, sleep_quality, note: str | None) -> None:
    existing = (
        db.query(WellbeingCheckin)
        .filter(WellbeingCheckin.user_id == user_id, WellbeingCheckin.log_on == day)
        .one_or_none()
    )
    if mood is None and energy is None and sleep_quality is None and note is None:
        if existing is not None:
            db.delete(existing)
        return
    if mood is None or energy is None or sleep_quality is None:
        raise CheckError("Mood, energy, and sleep are saved together.")
    if existing is None:
        db.add(
            WellbeingCheckin(
                user_id=user_id,
                log_on=day,
                mood=mood,
                energy=energy,
                sleep_quality=sleep_quality,
                note=note,
            )
        )
        return
    existing.mood = mood
    existing.energy = energy
    existing.sleep_quality = sleep_quality
    existing.note = note
