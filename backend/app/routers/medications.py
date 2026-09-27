from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Medication, MedicationEvent, User, utcnow
from app.schemas import MedicationIn, MedicationOut, MedicationPatch
from app.security import get_current_user

router = APIRouter(prefix="/medications", tags=["medications"])


def _owned(db: Session, user_id: int, medication_id: int) -> Medication:
    med = db.get(Medication, medication_id)
    if med is None or med.user_id != user_id:
        raise HTTPException(status_code=404, detail="Medicine not found.")
    return med


def _event(db: Session, user_id: int, med: Medication, event_type: str, event_on: date, note: str | None = None) -> None:
    db.add(
        MedicationEvent(
            user_id=user_id,
            medication_id=med.id,
            event_type=event_type,
            dose_amount=med.dose_amount,
            dose_unit=med.dose_unit,
            event_on=event_on,
            note=note,
            created_at=utcnow(),
        )
    )


@router.get("", response_model=list[MedicationOut])
def list_medications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Medication)
        .filter(Medication.user_id == user.id)
        .order_by(Medication.status, Medication.name)
        .all()
    )
    return rows


@router.post("", response_model=MedicationOut)
def create_medication(
    body: MedicationIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    started = body.started_on or date.today()
    med = Medication(
        user_id=user.id,
        name=body.name,
        dose_amount=body.dose_amount,
        dose_unit=body.dose_unit,
        schedule=body.schedule,
        is_steroid=body.is_steroid,
        status="active",
        started_on=started,
        stopped_on=None,
        notes=body.notes,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(med)
    db.flush()
    _event(db, user.id, med, "started", started)
    db.commit()
    db.refresh(med)
    return med


@router.get("/{medication_id}", response_model=MedicationOut)
def get_medication(
    medication_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _owned(db, user.id, medication_id)


@router.patch("/{medication_id}", response_model=MedicationOut)
def update_medication(
    medication_id: int,
    body: MedicationPatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    med = _owned(db, user.id, medication_id)
    data = body.model_dump(exclude_unset=True)
    dose_changed = False
    if "dose_amount" in data and data["dose_amount"] is not None and data["dose_amount"] != med.dose_amount:
        dose_changed = True
    if "dose_unit" in data and data["dose_unit"] is not None and data["dose_unit"] != med.dose_unit:
        dose_changed = True

    for field in ("name", "dose_amount", "dose_unit", "schedule", "is_steroid", "notes"):
        if field in data and data[field] is not None:
            setattr(med, field, data[field])
    if "notes" in data:
        med.notes = data["notes"]

    if dose_changed:
        _event(db, user.id, med, "dose_changed", date.today())

    if data.get("status") == "stopped" and med.status != "stopped":
        med.status = "stopped"
        med.stopped_on = data.get("stopped_on") or date.today()
        _event(db, user.id, med, "stopped", med.stopped_on)
    elif data.get("status") == "active":
        med.status = "active"
        med.stopped_on = None

    med.updated_at = utcnow()
    db.commit()
    db.refresh(med)
    return med
