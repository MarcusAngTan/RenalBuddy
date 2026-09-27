from sqlalchemy.orm import Session

from app.models import PatientProfile, User
from app.schemas import MeOut
from app.services.demo import account_has_clinical_data


def to_me(db: Session, user: User) -> MeOut:
    profile = db.get(PatientProfile, user.id)
    if profile is None:
        raise RuntimeError("Profile missing.")
    interests = profile.coping_interests or []
    return MeOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        last_appointment_on=profile.last_appointment_on,
        next_appointment_on=profile.next_appointment_on,
        coping_interests=list(interests),
        disclaimer_accepted_at=profile.disclaimer_accepted_at,
        has_clinical_data=account_has_clinical_data(db, user.id),
    )
