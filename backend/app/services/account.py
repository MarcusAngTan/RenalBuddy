from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models import (
    BodyLog,
    DipstickLog,
    DoctorQuestion,
    DoseLog,
    JournalEntry,
    Medication,
    MedicationEvent,
    PatientProfile,
    SideEffectLog,
    TaperPlan,
    TaperStep,
    User,
    VisitSummary,
    WellbeingCheckin,
    utcnow,
)
from app.schemas import MeOut
from app.services.demo import account_has_clinical_data
from app.services.summary import resolve_period


def interval_metrics(db: Session, profile: PatientProfile) -> dict:
    today = date.today()
    try:
        start, end = resolve_period(profile, None, None, today)
    except Exception:
        start, end = today - timedelta(days=30), today
    days_in_interval = (end - start).days + 1
    logged: set[date] = set()
    for row in db.query(DoseLog.log_on).filter(DoseLog.user_id == profile.user_id, DoseLog.log_on >= start, DoseLog.log_on <= end):
        logged.add(row[0])
    dip_start = datetime.combine(start, time.min)
    dip_end = datetime.combine(end, time.max)
    for row in db.query(DipstickLog.logged_at).filter(
        DipstickLog.user_id == profile.user_id,
        DipstickLog.logged_at >= dip_start,
        DipstickLog.logged_at <= dip_end,
    ):
        logged.add(row[0].date())
    for model in (BodyLog, WellbeingCheckin, SideEffectLog):
        for row in db.query(model.log_on).filter(model.user_id == profile.user_id, model.log_on >= start, model.log_on <= end):
            logged.add(row[0])
    open_questions = (
        db.query(DoctorQuestion)
        .filter(DoctorQuestion.user_id == profile.user_id, DoctorQuestion.status == "open")
        .count()
    )
    return {
        "days_logged_this_interval": len(logged),
        "days_in_interval": days_in_interval,
        "open_questions": open_questions,
        "visit_opened_at": profile.visit_opened_at,
    }


def to_me(db: Session, user: User) -> MeOut:
    profile = db.get(PatientProfile, user.id)
    if profile is None:
        raise RuntimeError("Profile missing.")
    interests = profile.coping_interests or []
    metrics = interval_metrics(db, profile)
    return MeOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        last_appointment_on=profile.last_appointment_on,
        next_appointment_on=profile.next_appointment_on,
        coping_interests=list(interests),
        disclaimer_accepted_at=profile.disclaimer_accepted_at,
        has_clinical_data=account_has_clinical_data(db, user.id),
        logs_for=profile.logs_for or "self",
        days_logged_this_interval=metrics["days_logged_this_interval"],
        days_in_interval=metrics["days_in_interval"],
        open_questions=metrics["open_questions"],
        visit_opened_at=metrics["visit_opened_at"],
    )


def _iso(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def export_account(db: Session, user: User) -> dict:
    profile = db.get(PatientProfile, user.id)
    meds = db.query(Medication).filter(Medication.user_id == user.id).all()
    events = db.query(MedicationEvent).filter(MedicationEvent.user_id == user.id).all()
    plans = db.query(TaperPlan).filter(TaperPlan.user_id == user.id).all()
    steps = (
        db.query(TaperStep)
        .join(TaperPlan, TaperStep.plan_id == TaperPlan.id)
        .filter(TaperPlan.user_id == user.id)
        .all()
    )
    return {
        "exported_at": utcnow().isoformat(),
        "user": {"email": user.email, "display_name": user.display_name, "created_at": _iso(user.created_at)},
        "profile": {
            "last_appointment_on": _iso(profile.last_appointment_on) if profile else None,
            "next_appointment_on": _iso(profile.next_appointment_on) if profile else None,
            "coping_interests": profile.coping_interests if profile else [],
            "logs_for": profile.logs_for if profile else "self",
        },
        "medications": [
            {
                "name": med.name,
                "dose_amount": float(med.dose_amount),
                "dose_unit": med.dose_unit,
                "schedule": med.schedule,
                "is_steroid": med.is_steroid,
                "status": med.status,
                "started_on": _iso(med.started_on),
                "stopped_on": _iso(med.stopped_on),
                "notes": med.notes,
            }
            for med in meds
        ],
        "medication_events": [
            {
                "event_type": row.event_type,
                "dose_amount": float(row.dose_amount),
                "dose_unit": row.dose_unit,
                "event_on": _iso(row.event_on),
                "note": row.note,
            }
            for row in events
        ],
        "taper_plans": [
            {
                "title": plan.title,
                "medication_name": plan.medication_name,
                "dose_unit": plan.dose_unit,
                "prescribed_note": plan.prescribed_note,
                "status": plan.status,
                "created_at": _iso(plan.created_at),
                "authored_by_user_id": plan.authored_by_user_id,
                "steps": [
                    {
                        "step_number": step.step_number,
                        "dose_amount": float(step.dose_amount),
                        "start_on": _iso(step.start_on),
                        "end_on": _iso(step.end_on),
                        "instruction": step.instruction,
                        "authored_at": _iso(step.authored_at),
                    }
                    for step in steps
                    if step.plan_id == plan.id
                ],
            }
            for plan in plans
        ],
        "dose_logs": [
            {
                "log_on": _iso(row.log_on),
                "slot": row.slot,
                "status": row.status,
                "prescribed_dose": float(row.prescribed_dose) if row.prescribed_dose is not None else None,
                "taken_dose": float(row.taken_dose) if row.taken_dose is not None else None,
            }
            for row in db.query(DoseLog).filter(DoseLog.user_id == user.id).all()
        ],
        "dipstick_logs": [
            {"logged_at": _iso(row.logged_at), "result": row.result, "note": row.note}
            for row in db.query(DipstickLog).filter(DipstickLog.user_id == user.id).all()
        ],
        "body_logs": [
            {
                "log_on": _iso(row.log_on),
                "weight_kg": float(row.weight_kg) if row.weight_kg is not None else None,
                "oedema_score": row.oedema_score,
            }
            for row in db.query(BodyLog).filter(BodyLog.user_id == user.id).all()
        ],
        "side_effects": [
            {"log_on": _iso(row.log_on), "effect_code": row.effect_code, "severity": row.severity, "note": row.note}
            for row in db.query(SideEffectLog).filter(SideEffectLog.user_id == user.id).all()
        ],
        "wellbeing": [
            {
                "log_on": _iso(row.log_on),
                "mood": row.mood,
                "energy": row.energy,
                "sleep_quality": row.sleep_quality,
                "note": row.note,
            }
            for row in db.query(WellbeingCheckin).filter(WellbeingCheckin.user_id == user.id).all()
        ],
        "journal": [
            {"body": row.body, "include_in_summary": row.include_in_summary, "created_at": _iso(row.created_at)}
            for row in db.query(JournalEntry).filter(JournalEntry.user_id == user.id).all()
        ],
        "questions": [
            {"body": row.body, "status": row.status, "created_at": _iso(row.created_at), "discussed_on": _iso(row.discussed_on)}
            for row in db.query(DoctorQuestion).filter(DoctorQuestion.user_id == user.id).all()
        ],
        "summaries": [
            {
                "period_start": _iso(row.period_start),
                "period_end": _iso(row.period_end),
                "summary_text": row.summary_text,
                "created_at": _iso(row.created_at),
            }
            for row in db.query(VisitSummary).filter(VisitSummary.user_id == user.id).all()
        ],
    }


def delete_account(db: Session, user: User) -> None:
    user_id = user.id
    db.query(VisitSummary).filter(VisitSummary.user_id == user_id).delete(synchronize_session=False)
    db.query(DoctorQuestion).filter(DoctorQuestion.user_id == user_id).delete(synchronize_session=False)
    db.query(JournalEntry).filter(JournalEntry.user_id == user_id).delete(synchronize_session=False)
    db.query(WellbeingCheckin).filter(WellbeingCheckin.user_id == user_id).delete(synchronize_session=False)
    db.query(SideEffectLog).filter(SideEffectLog.user_id == user_id).delete(synchronize_session=False)
    db.query(BodyLog).filter(BodyLog.user_id == user_id).delete(synchronize_session=False)
    db.query(DipstickLog).filter(DipstickLog.user_id == user_id).delete(synchronize_session=False)
    db.query(DoseLog).filter(DoseLog.user_id == user_id).delete(synchronize_session=False)
    plan_ids = [row.id for row in db.query(TaperPlan.id).filter(TaperPlan.user_id == user_id).all()]
    if plan_ids:
        db.query(TaperStep).filter(TaperStep.plan_id.in_(plan_ids)).delete(synchronize_session=False)
    db.query(TaperPlan).filter(TaperPlan.user_id == user_id).delete(synchronize_session=False)
    db.query(MedicationEvent).filter(MedicationEvent.user_id == user_id).delete(synchronize_session=False)
    db.query(Medication).filter(Medication.user_id == user_id).delete(synchronize_session=False)
    db.query(PatientProfile).filter(PatientProfile.user_id == user_id).delete(synchronize_session=False)
    db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
    db.commit()
