from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.constants import RESOURCES
from app.database import get_db
from app.models import DoctorQuestion, JournalEntry, SupportResource, User, utcnow
from app.schemas import (
    CopingListOut,
    JournalIn,
    JournalOut,
    JournalPatch,
    QuestionIn,
    QuestionOut,
    QuestionPatch,
    ResourceOut,
)
from app.security import get_current_user
from app.services.account import to_me
from app.services.coping import suggestions_for

router = APIRouter(tags=["support"])


@router.get("/journal", response_model=list[JournalOut])
def list_journal(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(JournalEntry)
        .filter(JournalEntry.user_id == user.id)
        .order_by(JournalEntry.created_at.desc())
        .all()
    )


@router.post("/journal", response_model=JournalOut)
def create_journal(
    body: JournalIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = JournalEntry(
        user_id=user.id,
        body=body.body,
        include_in_summary=body.include_in_summary,
        created_at=utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/journal/{entry_id}", response_model=JournalOut)
def update_journal(
    entry_id: int,
    body: JournalPatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.get(JournalEntry, entry_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Note not found.")
    data = body.model_dump(exclude_unset=True)
    if "body" in data and data["body"] is not None:
        row.body = data["body"]
    if "include_in_summary" in data and data["include_in_summary"] is not None:
        row.include_in_summary = data["include_in_summary"]
    db.commit()
    db.refresh(row)
    return row


@router.get("/questions", response_model=list[QuestionOut])
def list_questions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(DoctorQuestion)
        .filter(DoctorQuestion.user_id == user.id)
        .order_by(DoctorQuestion.status.desc(), DoctorQuestion.created_at.desc())
        .all()
    )


@router.post("/questions", response_model=QuestionOut)
def create_question(
    body: QuestionIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = DoctorQuestion(
        user_id=user.id,
        body=body.body,
        status="open",
        created_at=utcnow(),
        discussed_on=None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/questions/{question_id}", response_model=QuestionOut)
def update_question(
    question_id: int,
    body: QuestionPatch,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.get(DoctorQuestion, question_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Question not found.")
    data = body.model_dump(exclude_unset=True)
    if "body" in data and data["body"] is not None:
        row.body = data["body"]
    if data.get("status") == "discussed":
        row.status = "discussed"
        row.discussed_on = row.discussed_on or date.today()
    elif data.get("status") == "open":
        row.status = "open"
        row.discussed_on = None
    db.commit()
    db.refresh(row)
    return row


@router.get("/resources", response_model=list[ResourceOut])
def resources(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    del user
    rank = {item["title"]: index for index, item in enumerate(RESOURCES)}
    rows = db.query(SupportResource).all()
    return sorted(rows, key=lambda row: rank.get(row.title, 99))


@router.get("/coping", response_model=CopingListOut)
def coping(
    mood: int | None = Query(default=None, ge=1, le=5),
    energy: int | None = Query(default=None, ge=1, le=5),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    me = to_me(db, user)
    items, using_defaults = suggestions_for(me.coping_interests, mood=mood, energy=energy)
    return {"suggestions": items, "using_defaults": using_defaults}
