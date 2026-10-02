from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import DipstickLog, DoctorQuestion, DoseLog, SideEffectLog
from app.services.tracking import next_step_after, steroid_taper_plan, steps_for

STATIC_SUGGESTIONS = [
    {
        "id": "steroid-effects",
        "body": "Can we talk about steroid side effects I have been logging?",
        "reason": "Always available. You confirm before it is added.",
    },
    {
        "id": "when-to-dip",
        "body": "How often should I check a home urine dipstick before the next visit?",
        "reason": "The app will not tell you when to call. Ask your team.",
    },
    {
        "id": "vaccines",
        "body": "Should I ask about vaccines while I am on immunosuppression?",
        "reason": "A clinic question, not an app protocol.",
    },
    {
        "id": "next-taper",
        "body": "What is the next prescribed taper step after this interval?",
        "reason": "Only your nephrologist can change the plan.",
    },
    {
        "id": "salt-fluid",
        "body": "Do I need any salt or fluid advice written down for this interval?",
        "reason": "Offered only as a question. The app does not set a diet.",
    },
]


def _already_asked(db: Session, user_id: int) -> set[str]:
    rows = db.query(DoctorQuestion).filter(DoctorQuestion.user_id == user_id).all()
    return {row.body.strip().lower() for row in rows}


def suggest_questions(db: Session, user_id: int, today: date | None = None) -> list[dict]:
    today = today or date.today()
    asked = _already_asked(db, user_id)
    items: list[dict] = []
    for item in STATIC_SUGGESTIONS:
        items.append({**item, "source": "static", "already_saved": item["body"].strip().lower() in asked})

    window_start = today - timedelta(days=13)
    infection_days = (
        db.query(SideEffectLog)
        .filter(
            SideEffectLog.user_id == user_id,
            SideEffectLog.effect_code == "infection_concern",
            SideEffectLog.log_on >= window_start,
            SideEffectLog.log_on <= today,
        )
        .count()
    )
    if infection_days >= 3:
        body = "I logged infection concern on several days. Can we review that at this visit?"
        items.append(
            {
                "id": "infection-pattern",
                "body": body,
                "reason": "You logged infection concern on three or more days. This is a question, not a diagnosis.",
                "source": "pattern",
                "already_saved": body.strip().lower() in asked,
            }
        )

    high_protein = (
        db.query(DipstickLog)
        .filter(DipstickLog.user_id == user_id, DipstickLog.result.in_(("3+", "4+")))
        .count()
    )
    if high_protein:
        body = "I logged urine protein at 3+ or 4+. When should I call the team about a home dipstick?"
        items.append(
            {
                "id": "high-protein-call",
                "body": body,
                "reason": "The app reports what you typed. It will not label this as a relapse.",
                "source": "pattern",
                "already_saved": body.strip().lower() in asked,
            }
        )

    missed = (
        db.query(DoseLog)
        .filter(DoseLog.user_id == user_id, DoseLog.status == "missed", DoseLog.log_on >= window_start)
        .count()
    )
    if missed >= 2:
        body = "I missed more than one prescribed dose in the last two weeks. Can we talk about what got in the way?"
        items.append(
            {
                "id": "missed-doses",
                "body": body,
                "reason": "A barrier question. No guilt score.",
                "source": "pattern",
                "already_saved": body.strip().lower() in asked,
            }
        )

    plan = steroid_taper_plan(db, user_id)
    if plan is not None:
        nxt = next_step_after(steps_for(db, plan.id), today)
        if nxt is not None:
            body = f"The next typed taper step is {nxt.dose_amount} {plan.dose_unit} on {nxt.start_on.isoformat()}. Is that still the plan?"
            items.append(
                {
                    "id": "confirm-next-step",
                    "body": body,
                    "reason": "Repeats a date you already entered. The app will not invent the next dose.",
                    "source": "pattern",
                    "already_saved": body.strip().lower() in asked,
            }
        )
    return items
