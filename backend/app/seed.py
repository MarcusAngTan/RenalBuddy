from sqlalchemy.orm import Session, sessionmaker

from app.constants import RESOURCES
from app.database import get_engine
from app.models import SupportResource


def seed() -> None:
    db: Session = sessionmaker(bind=get_engine(), autoflush=False, autocommit=False)()
    try:
        if db.query(SupportResource).count() == 0:
            for item in RESOURCES:
                db.add(SupportResource(**item))
            db.commit()
    finally:
        db.close()
