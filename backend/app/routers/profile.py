from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PatientProfile, User, utcnow
from app.schemas import MeOut, ProfilePatch
from app.security import get_current_user
from app.services.account import to_me

router = APIRouter(prefix="/profile", tags=["profile"])


@router.patch("", response_model=MeOut)
def update_profile(
    body: ProfilePatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.get(PatientProfile, user.id)
    data = body.model_dump(exclude_unset=True)
    if "display_name" in data and data["display_name"] is not None:
        user.display_name = data["display_name"]
    if "last_appointment_on" in data:
        profile.last_appointment_on = data["last_appointment_on"]
    if "next_appointment_on" in data:
        profile.next_appointment_on = data["next_appointment_on"]
    if "coping_interests" in data and data["coping_interests"] is not None:
        profile.coping_interests = data["coping_interests"]
    if "logs_for" in data and data["logs_for"] is not None:
        profile.logs_for = data["logs_for"]
    if data.get("mark_visit_opened"):
        profile.visit_opened_at = utcnow()
    db.commit()
    db.refresh(user)
    return to_me(db, user)
