from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import date
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PatientProfile, User, VisitSummary
from app.schemas import CloseIn, CloseOut, SummaryCreate, SummaryOut
from app.security import get_current_user
from app.services.summary import PeriodError, build_summary, save_summary

router = APIRouter(tags=["summaries"])


def _profile(db: Session, user_id: int) -> PatientProfile:
    profile = db.get(PatientProfile, user_id)
    if profile is None:
        raise HTTPException(status_code=400, detail="Profile missing.")
    return profile


def _out(row: VisitSummary) -> SummaryOut:
    return SummaryOut(
        id=row.id,
        period_start=row.period_start,
        period_end=row.period_end,
        summary_text=row.summary_text,
        summary_json=row.summary_json,
        created_at=row.created_at,
    )


@router.get("/summaries/preview", response_model=SummaryOut)
def preview(
    start: date | None = Query(default=None, alias="from"),
    end: date | None = Query(default=None, alias="to"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        text, payload, period_start, period_end = build_summary(db, _profile(db, user.id), start, end)
    except PeriodError as exc:
        raise HTTPException(status_code=400, detail=exc.message) from exc
    return SummaryOut(
        id=None,
        period_start=period_start,
        period_end=period_end,
        summary_text=text,
        summary_json=payload,
        created_at=None,
    )


@router.get("/summaries", response_model=list[SummaryOut])
def list_summaries(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(VisitSummary)
        .filter(VisitSummary.user_id == user.id)
        .order_by(VisitSummary.created_at.desc())
        .limit(20)
        .all()
    )
    return [_out(row) for row in rows]


@router.post("/summaries", response_model=SummaryOut)
def create_summary(
    body: SummaryCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        row = save_summary(db, _profile(db, user.id), body.period_start, body.period_end)
    except PeriodError as exc:
        raise HTTPException(status_code=400, detail=exc.message) from exc
    return _out(row)


@router.post("/appointments/close", response_model=CloseOut)
def close_appointment(
    body: CloseIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = _profile(db, user.id)
    try:
        row = save_summary(db, profile, body.period_start, body.period_end, commit=False)
    except PeriodError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=exc.message) from exc
    profile.last_appointment_on = body.appointment_on or date.today()
    db.commit()
    db.refresh(row)
    return CloseOut(last_appointment_on=profile.last_appointment_on, summary=_out(row))
