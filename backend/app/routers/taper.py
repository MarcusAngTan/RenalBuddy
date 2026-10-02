from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import TaperPlan, TaperStep, User, utcnow
from app.schemas import TaperCreate, TaperPlanOut
from app.security import get_current_user
from app.services.tracking import step_state, steps_for

router = APIRouter(prefix="/taper-plans", tags=["taper"])


def _plan_out(db: Session, plan: TaperPlan, day: date) -> TaperPlanOut:
    steps = steps_for(db, plan.id)
    return TaperPlanOut(
        id=plan.id,
        title=plan.title,
        medication_name=plan.medication_name,
        dose_unit=plan.dose_unit,
        prescribed_note=plan.prescribed_note,
        status=plan.status,
        created_at=plan.created_at,
        steps=[
            {
                "id": step.id,
                "step_number": step.step_number,
                "dose_amount": float(step.dose_amount),
                "start_on": step.start_on,
                "end_on": step.end_on,
                "instruction": step.instruction,
                "state": step_state(step, day),
            }
            for step in steps
        ],
    )


def _validate_steps(steps) -> list:
    ordered = sorted(steps, key=lambda step: (step.start_on, step.end_on))
    for step in ordered:
        if step.end_on < step.start_on:
            raise HTTPException(status_code=400, detail="Each taper step needs an end date on or after the start date.")
    for earlier, later in zip(ordered, ordered[1:]):
        if later.start_on <= earlier.end_on:
            raise HTTPException(status_code=400, detail="Taper steps overlap. Give each step its own dates.")
    return ordered


@router.get("", response_model=list[TaperPlanOut])
def list_plans(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plans = (
        db.query(TaperPlan)
        .filter(TaperPlan.user_id == user.id)
        .order_by(TaperPlan.created_at.desc())
        .all()
    )
    today = date.today()
    return [_plan_out(db, plan, today) for plan in plans]


@router.post("", response_model=TaperPlanOut)
def create_plan(
    body: TaperCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ordered = _validate_steps(body.steps)
    (
        db.query(TaperPlan)
        .filter(
            TaperPlan.user_id == user.id,
            TaperPlan.status == "active",
            TaperPlan.medication_name == body.medication_name,
        )
        .update({TaperPlan.status: "replaced"})
    )
    plan = TaperPlan(
        user_id=user.id,
        title=body.title,
        medication_name=body.medication_name,
        dose_unit=body.dose_unit,
        prescribed_note=body.prescribed_note,
        status="active",
        created_at=utcnow(),
        authored_by_user_id=user.id,
    )
    db.add(plan)
    db.flush()
    for index, step in enumerate(ordered, start=1):
        db.add(
            TaperStep(
                plan_id=plan.id,
                step_number=index,
                dose_amount=step.dose_amount,
                start_on=step.start_on,
                end_on=step.end_on,
                instruction=step.instruction,
                authored_at=utcnow(),
            )
        )
    db.commit()
    db.refresh(plan)
    return _plan_out(db, plan, date.today())
