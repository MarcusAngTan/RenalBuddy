from datetime import date, timedelta

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
    WellbeingCheckin,
    utcnow,
)
from app.services.tracking import source_key


class DemoError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def account_has_clinical_data(db: Session, user_id: int) -> bool:
    checks = (
        db.query(Medication.id).filter(Medication.user_id == user_id).first(),
        db.query(TaperPlan.id).filter(TaperPlan.user_id == user_id).first(),
        db.query(DoseLog.id).filter(DoseLog.user_id == user_id).first(),
        db.query(JournalEntry.id).filter(JournalEntry.user_id == user_id).first(),
        db.query(DoctorQuestion.id).filter(DoctorQuestion.user_id == user_id).first(),
    )
    return any(checks)


def load_sample_week(db: Session, profile: PatientProfile) -> dict:
    if account_has_clinical_data(db, profile.user_id):
        raise DemoError("Sample data only loads into an empty log.")

    today = date.today()
    day_a = today - timedelta(days=2)
    day_b = today - timedelta(days=1)

    # Shared visit milestones: both medicines start together; each later step shares the same start date.
    plan_start = today - timedelta(days=10)
    step1_end = today - timedelta(days=4)
    step2_start = today - timedelta(days=3)
    step2_end = today + timedelta(days=3)
    step3_start = today + timedelta(days=4)
    step3_end = today + timedelta(days=10)
    step4_start = today + timedelta(days=11)
    step4_end = today + timedelta(days=24)
    maintain_end = today + timedelta(days=60)

    profile.last_appointment_on = step2_start
    profile.next_appointment_on = today + timedelta(days=14)

    med = Medication(
        user_id=profile.user_id,
        name="Cyclosporine",
        dose_amount=50,
        dose_unit="mg",
        schedule="daily",
        is_steroid=False,
        status="active",
        started_on=plan_start,
        notes=None,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(med)
    db.flush()
    db.add(
        MedicationEvent(
            user_id=profile.user_id,
            medication_id=med.id,
            event_type="started",
            dose_amount=50,
            dose_unit="mg",
            event_on=plan_start,
            note=None,
            created_at=utcnow(),
        )
    )

    plan = TaperPlan(
        user_id=profile.user_id,
        title="Prednisolone taper",
        medication_name="Prednisolone",
        dose_unit="mg",
        prescribed_note="Sample plan typed in as if it came from clinic",
        status="active",
        created_at=utcnow(),
        authored_by_user_id=profile.user_id,
    )
    db.add(plan)
    db.flush()
    steps = [
        (1, 40, plan_start, step1_end, "Once each morning"),
        (2, 30, step2_start, step2_end, "Once each morning"),
        (3, 20, step3_start, step3_end, "Once each morning"),
        (4, 10, step4_start, step4_end, "Once each morning"),
    ]
    step_rows = []
    for number, dose, start, end, instruction in steps:
        row = TaperStep(
            plan_id=plan.id,
            step_number=number,
            dose_amount=dose,
            start_on=start,
            end_on=end,
            instruction=instruction,
        )
        db.add(row)
        step_rows.append(row)
    db.flush()
    current = step_rows[1]

    cni_plan = TaperPlan(
        user_id=profile.user_id,
        title="Cyclosporine plan",
        medication_name="Cyclosporine",
        dose_unit="mg",
        prescribed_note="Clinic titration plan",
        status="active",
        created_at=utcnow(),
        authored_by_user_id=profile.user_id,
    )
    db.add(cni_plan)
    db.flush()
    cni_steps = [
        (1, 25, plan_start, step1_end, "Once each evening"),
        (2, 50, step2_start, step2_end, "Once each evening"),
        (3, 50, step3_start, maintain_end, "Once each evening"),
    ]
    for number, dose, start, end, instruction in cni_steps:
        db.add(
            TaperStep(
                plan_id=cni_plan.id,
                step_number=number,
                dose_amount=dose,
                start_on=start,
                end_on=end,
                instruction=instruction,
                authored_at=utcnow(),
            )
        )

    def add_dose(day: date, status: str, taken, prescribed, medication_id=None, taper_step_id=None):
        db.add(
            DoseLog(
                user_id=profile.user_id,
                log_on=day,
                medication_id=medication_id,
                taper_step_id=taper_step_id,
                slot="daily",
                prescribed_dose=prescribed,
                status=status,
                taken_dose=taken,
                note=None,
                logged_at=utcnow(),
                source_key=source_key(medication_id, taper_step_id, "daily"),
            )
        )

    for day in (day_a, day_b, today):
        add_dose(day, "taken", 50, 50, medication_id=med.id)
    add_dose(day_a, "taken", 30, 30, taper_step_id=current.id)
    add_dose(day_b, "missed", None, 30, taper_step_id=current.id)
    add_dose(today, "different_dose", 15, 30, taper_step_id=current.id)

    db.add(DipstickLog(user_id=profile.user_id, logged_at=datetime_at(day_a), result="trace", note=None))
    db.add(DipstickLog(user_id=profile.user_id, logged_at=datetime_at(day_b), result="3+", note=None))
    db.add(DipstickLog(user_id=profile.user_id, logged_at=datetime_at(today), result="2+", note=None))

    db.add(BodyLog(user_id=profile.user_id, log_on=day_a, weight_kg=62.4, oedema_score=1, note=None))
    db.add(BodyLog(user_id=profile.user_id, log_on=day_b, weight_kg=63.1, oedema_score=2, note=None))
    db.add(BodyLog(user_id=profile.user_id, log_on=today, weight_kg=62.8, oedema_score=1, note=None))

    db.add(SideEffectLog(user_id=profile.user_id, log_on=day_a, effect_code="sleep", severity=1, note=None))
    db.add(SideEffectLog(user_id=profile.user_id, log_on=day_b, effect_code="infection_concern", severity=2, note=None))
    db.add(SideEffectLog(user_id=profile.user_id, log_on=today, effect_code="appetite", severity=2, note=None))

    db.add(WellbeingCheckin(user_id=profile.user_id, log_on=day_a, mood=4, energy=3, sleep_quality=3, note=None))
    db.add(WellbeingCheckin(user_id=profile.user_id, log_on=day_b, mood=2, energy=2, sleep_quality=2, note="Felt flat."))
    db.add(WellbeingCheckin(user_id=profile.user_id, log_on=today, mood=3, energy=3, sleep_quality=3, note=None))

    db.add(
        JournalEntry(
            user_id=profile.user_id,
            body="Face looked puffier this morning and I felt flat after the missed steroid dose.",
            include_in_summary=True,
            created_at=utcnow(),
        )
    )
    db.add(
        DoctorQuestion(
            user_id=profile.user_id,
            body="If protein stays at 3+, should we pause the taper?",
            status="open",
            created_at=utcnow(),
            discussed_on=None,
        )
    )
    db.commit()
    return {"status": "loaded", "days": [day_a.isoformat(), day_b.isoformat(), today.isoformat()]}


def datetime_at(day: date):
    from datetime import datetime, time

    return datetime.combine(day, time(8, 0))
