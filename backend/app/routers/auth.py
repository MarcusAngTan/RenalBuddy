from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PatientProfile, User, utcnow
from app.schemas import LoginIn, MeOut, RegisterIn, TokenOut
from app.limiter import rate_limit
from app.security import create_token, get_current_user, hash_password, verify_password
from app.services.account import to_me

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut)
def register(body: RegisterIn, request: Request, db: Session = Depends(get_db)):
    rate_limit(request, limit=8, window_seconds=60)
    if not body.disclaimer_accepted:
        raise HTTPException(status_code=400, detail="Accept the disclaimer to create an account.")
    existing = db.query(User).filter(User.email == body.email).one_or_none()
    if existing is not None:
        raise HTTPException(status_code=400, detail="An account with that email already exists.")
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
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
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=create_token(user.id), user=to_me(db, user))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    rate_limit(request, limit=8, window_seconds=60)
    user = db.query(User).filter(User.email == body.email).one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return TokenOut(access_token=create_token(user.id), user=to_me(db, user))


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return to_me(db, user)
