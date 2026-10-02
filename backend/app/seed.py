from sqlalchemy.orm import Session, sessionmaker

from app.constants import DEMO_USER_EMAIL, DEMO_USER_PASSWORD, RESOURCES
from app.database import get_engine
from app.models import PatientProfile, SupportResource, User, utcnow
from app.security import hash_password


def seed_demo_user(db: Session) -> None:
    """Public demo login for judges (empty log until Today → Demo data)."""
    existing = db.query(User).filter(User.email == DEMO_USER_EMAIL).one_or_none()
    if existing is not None:
        return
    user = User(
        email=DEMO_USER_EMAIL,
        password_hash=hash_password(DEMO_USER_PASSWORD),
        display_name="Ada (demo)",
        created_at=utcnow(),
    )
    db.add(user)
    db.flush()
    db.add(
        PatientProfile(
            user_id=user.id,
            last_appointment_on=None,
            next_appointment_on=None,
            coping_interests=[],
            disclaimer_accepted_at=utcnow(),
            logs_for="self",
            visit_opened_at=None,
        )
    )


def seed() -> None:
    db: Session = sessionmaker(bind=get_engine(), autoflush=False, autocommit=False)()
    try:
        seed_demo_user(db)
        existing = {row.title: row for row in db.query(SupportResource).all()}
        keep = {item["title"] for item in RESOURCES}
        for item in RESOURCES:
            row = existing.get(item["title"])
            if row is None:
                db.add(SupportResource(**item))
            else:
                row.url = item["url"]
                row.description = item["description"]
        for title, row in existing.items():
            if title not in keep:
                db.delete(row)
        db.commit()
    finally:
        db.close()
