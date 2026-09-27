from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BodyLog, DipstickLog, PatientProfile, SideEffectLog, User, WellbeingCheckin
from app.schemas import (
    BodyOut,
    DailyCheckIn,
    DipstickOut,
    SideEffectLogOut,
    TodayOut,
    WellbeingOut,
)
from app.security import get_current_user
from app.services.tracking import CheckError, build_today, save_daily_check

router = APIRouter(tags=["tracking"])


def _profile(db: Session, user_id: int) -> PatientProfile:
    profile = db.get(PatientProfile, user_id)
    if profile is None:
        raise HTTPException(status_code=400, detail="Profile missing.")
    return profile


@router.get("/today", response_model=TodayOut)
def today(
    on: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    day = on or date.today()
    return build_today(db, user.id, day, _profile(db, user.id))


@router.post("/daily-check", response_model=TodayOut)
def daily_check(
    body: DailyCheckIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        save_daily_check(db, user.id, body)
    except CheckError as exc:
        raise HTTPException(status_code=400, detail=exc.message) from exc
    return build_today(db, user.id, body.on, _profile(db, user.id))


def _range(start: date | None, end: date | None) -> tuple[date, date]:
    period_end = end or date.today()
    period_start = start or (period_end - timedelta(days=30))
    if period_start > period_end:
        raise HTTPException(status_code=400, detail="The start date is after the end date.")
    return period_start, period_end


@router.get("/logs/dipstick", response_model=list[DipstickOut])
def dipstick_logs(
    start: date | None = Query(default=None, alias="from"),
    end: date | None = Query(default=None, alias="to"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    period_start, period_end = _range(start, end)
    opened = datetime.combine(period_start, time.min)
    closed = datetime.combine(period_end, time.max)
    return (
        db.query(DipstickLog)
        .filter(DipstickLog.user_id == user.id, DipstickLog.logged_at >= opened, DipstickLog.logged_at <= closed)
        .order_by(DipstickLog.logged_at)
        .all()
    )


@router.get("/logs/body", response_model=list[BodyOut])
def body_logs(
    start: date | None = Query(default=None, alias="from"),
    end: date | None = Query(default=None, alias="to"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    period_start, period_end = _range(start, end)
    return (
        db.query(BodyLog)
        .filter(BodyLog.user_id == user.id, BodyLog.log_on >= period_start, BodyLog.log_on <= period_end)
        .order_by(BodyLog.log_on)
        .all()
    )


@router.get("/logs/side-effects", response_model=list[SideEffectLogOut])
def side_effect_logs(
    start: date | None = Query(default=None, alias="from"),
    end: date | None = Query(default=None, alias="to"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    period_start, period_end = _range(start, end)
    return (
        db.query(SideEffectLog)
        .filter(SideEffectLog.user_id == user.id, SideEffectLog.log_on >= period_start, SideEffectLog.log_on <= period_end)
        .order_by(SideEffectLog.log_on, SideEffectLog.effect_code)
        .all()
    )


@router.get("/logs/wellbeing", response_model=list[WellbeingOut])
def wellbeing_logs(
    start: date | None = Query(default=None, alias="from"),
    end: date | None = Query(default=None, alias="to"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    period_start, period_end = _range(start, end)
    return (
        db.query(WellbeingCheckin)
        .filter(
            WellbeingCheckin.user_id == user.id,
            WellbeingCheckin.log_on >= period_start,
            WellbeingCheckin.log_on <= period_end,
        )
        .order_by(WellbeingCheckin.log_on)
        .all()
    )
