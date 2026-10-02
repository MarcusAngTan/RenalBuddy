from sqlalchemy.orm import Session, sessionmaker

from app.constants import RESOURCES
from app.database import get_engine
from app.models import SupportResource


def seed() -> None:
    db: Session = sessionmaker(bind=get_engine(), autoflush=False, autocommit=False)()
    try:
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
