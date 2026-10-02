from datetime import date, timedelta

from app.services.summary import (
    BodyFact,
    CheckinFact,
    DipFact,
    EffectFact,
    Facts,
    StepFact,
    TaperFact,
    compose,
)


def test_summary_uses_logged_values_without_clinical_labels():
    today = date(2026, 9, 26)
    facts = Facts(
        period_start=today - timedelta(days=3),
        period_end=today,
        events=[],
        med_logs=[],
        tapers=[
            TaperFact(
                title="Prednisolone taper",
                status="active",
                prescribed_note="Clinic 22 Sep",
                steps=[
                    StepFact(
                        dose_amount=30,
                        dose_unit="mg",
                        start_on=today - timedelta(days=3),
                        end_on=today + timedelta(days=3),
                        taken=1,
                        missed=1,
                        different=[(today, 15, 30)],
                    )
                ],
                next_dose=20,
                next_unit="mg",
                next_on=today + timedelta(days=4),
            )
        ],
        dips=[DipFact(today - timedelta(days=1), "3+"), DipFact(today, "2+")],
        bodies=[
            BodyFact(today - timedelta(days=1), 62.4, 1),
            BodyFact(today, 63.1, 2),
        ],
        effects=[EffectFact(today - timedelta(days=1), "sleep", 2), EffectFact(today, "sleep", 3)],
        checkins=[CheckinFact(today - timedelta(days=1), 2, 2, 2), CheckinFact(today, 4, 3, 3)],
        notes=["Face looked puffy."],
        questions=["Can we talk about the 3+ result?"],
        days_logged=2,
        days_in_interval=4,
    )
    text, payload = compose(facts)
    assert "prescribed 30 mg" in text
    assert "logged 15" in text
    assert "missed 1 day" in text
    assert "Highest 3+" in text
    assert "Face looked puffy." in text
    assert "Logged 2 of 4 days" in text
    assert "This pack is incomplete." in text
    assert "will not tell you when to call" in text
    assert "every Monday" not in text
    assert "relapse" not in text.lower()
    assert "recommended" not in text.lower()
    assert "remission" not in text.lower()
    assert "you should" not in text.lower()
    titles = [section["title"] for section in payload["sections"]]
    assert "Medicines" in titles
    assert any(section["lines"] == ["Not logged."] for section in payload["sections"])
