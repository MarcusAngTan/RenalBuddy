from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PatientProfile, User
from app.security import get_current_user
from app.services.demo import DemoError, load_sample_week

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/sample-week")
def sample_week(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.get(PatientProfile, user.id)
    if profile is None:
        raise HTTPException(status_code=400, detail="Profile missing.")
    try:
        return load_sample_week(db, profile)
    except DemoError as exc:
        raise HTTPException(status_code=400, detail=exc.message) from exc
