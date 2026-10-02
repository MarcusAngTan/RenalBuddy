from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import MedicineExplainOut, QuestionSuggestionOut
from app.security import get_current_user
from app.services.account import delete_account, export_account
from app.services.lexicon import explain_medicine
from app.services.questions import suggest_questions

router = APIRouter(tags=["companion"])


@router.get("/medicines/explain", response_model=MedicineExplainOut)
def explain(name: str = Query(min_length=1, max_length=120), user: User = Depends(get_current_user)):
    del user
    return explain_medicine(name)


@router.get("/questions/suggestions", response_model=list[QuestionSuggestionOut])
def suggestions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return suggest_questions(db, user.id)


@router.get("/account/export")
def export_log(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return export_account(db, user)


@router.delete("/account")
def remove_account(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    delete_account(db, user)
    return {"status": "deleted"}
