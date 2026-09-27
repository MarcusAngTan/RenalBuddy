from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.constants import DIPSTICK_LABELS, DIPSTICK_RANK, EFFECTS, OEDEMA_LABELS
from app.models import (
    BodyLog,
    DipstickLog,
    DoctorQuestion,
    DoseLog,
    JournalEntry,
    Medication,
    MedicationEvent,
    PatientProfile,
    SideEffectLog,
    TaperPlan,
    TaperStep,
    VisitSummary,
    WellbeingCheckin,
)
from app.services.tracking import steps_for


class PeriodError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def fmt_date(day: date) -> str:
    return f"{day.day} {day.strftime('%b %Y')}"


def count_phrase(count: int) -> str:
    return f"{count} day" if count == 1 else f"{count} days"


def fmt_num(value: Decimal | float | int) -> str:
    number = Decimal(str(value)).normalize()
    text = format(number, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text


def resolve_period(profile: PatientProfile, start: date | None, end: date | None, today: date) -> tuple[date, date]:
    period_end = end or today
    if start is None:
        if profile.last_appointment_on is not None:
            period_start = profile.last_appointment_on + timedelta(days=1)
        else:
            period_start = period_end - timedelta(days=30)
    else:
        period_start = start
    if period_start > period_end:
        raise PeriodError("No days since the last appointment yet.")
    return period_start, period_end


@dataclass
class EventFact:
    event_on: date
    event_type: str
    name: str
    dose_amount: Decimal
    dose_unit: str


@dataclass
class MedLogFact:
    name: str
    dose_unit: str
    taken: int
    missed: int
    different: list[tuple[date, Decimal, Decimal]]


@dataclass
class StepFact:
    dose_amount: Decimal
    dose_unit: str
    start_on: date
    end_on: date
    taken: int
    missed: int
    different: list[tuple[date, Decimal, Decimal]]


@dataclass
class TaperFact:
    title: str
    status: str
    prescribed_note: str | None
    steps: list[StepFact]
    next_dose: Decimal | None
    next_unit: str | None
    next_on: date | None


@dataclass
class DipFact:
    logged_on: date
    result: str


@dataclass
class BodyFact:
    log_on: date
    weight_kg: Decimal | None
    oedema_score: int | None


@dataclass
class EffectFact:
    effect_code: str
    severity: int


@dataclass
class CheckinFact:
    log_on: date
    mood: int
    energy: int
    sleep_quality: int


@dataclass
class Facts:
    period_start: date
    period_end: date
    events: list[EventFact]
    med_logs: list[MedLogFact]
    tapers: list[TaperFact]
    dips: list[DipFact]
    bodies: list[BodyFact]
    effects: list[EffectFact]
    checkins: list[CheckinFact]
    notes: list[str]
    questions: list[str]


def _section(key: str, title: str, lines: list[str]) -> dict:
    body = lines or ["Not logged."]
    return {"key": key, "title": title, "lines": body}


def _different_phrase(rows: list[tuple[date, Decimal, Decimal]], limit: int = 6) -> str:
    shown = rows[:limit]
    parts = [
        f"{fmt_date(day)}: logged {fmt_num(taken)} (prescribed {fmt_num(prescribed)})"
        for day, taken, prescribed in shown
    ]
    extra = len(rows) - len(shown)
    if extra > 0:
        parts.append(f"{extra} more")
    return "; ".join(parts)


def compose(facts: Facts) -> tuple[str, dict]:
    medicine_lines: list[str] = []
    for event in facts.events:
        dose = f"{fmt_num(event.dose_amount)} {event.dose_unit}"
        if event.event_type == "started":
            medicine_lines.append(f"{fmt_date(event.event_on)}: started {event.name} {dose}.")
        elif event.event_type == "stopped":
            medicine_lines.append(f"{fmt_date(event.event_on)}: stopped {event.name} (last entered dose {dose}).")
        else:
            medicine_lines.append(f"{fmt_date(event.event_on)}: dose changed for {event.name} to {dose}.")
    for med in facts.med_logs:
        line = (
            f"{med.name}: logged taken {count_phrase(med.taken)}, missed {count_phrase(med.missed)}, "
            f"different dose {count_phrase(len(med.different))}."
        )
        if med.different:
            line += f" { _different_phrase(med.different) }."
        medicine_lines.append(line)

    taper_lines: list[str] = []
    for taper in facts.tapers:
        label = taper.title
        if taper.status == "replaced":
            label += " (replaced plan)"
        if taper.prescribed_note:
            taper_lines.append(f"{label}. Note entered with the plan: {taper.prescribed_note}.")
        else:
            taper_lines.append(f"{label}.")
        for step in taper.steps:
            line = (
                f"{fmt_date(step.start_on)}–{fmt_date(step.end_on)}: prescribed {fmt_num(step.dose_amount)} {step.dose_unit}. "
                f"Logged taken {count_phrase(step.taken)}, missed {count_phrase(step.missed)}, "
                f"different dose {count_phrase(len(step.different))}."
            )
            if step.different:
                line += f" {_different_phrase(step.different)}."
            taper_lines.append(line)
        if taper.status == "active" and taper.next_on is not None and taper.next_dose is not None:
            taper_lines.append(
                f"Next prescribed change: {fmt_num(taper.next_dose)} {taper.next_unit} starting {fmt_date(taper.next_on)}."
            )

    dip_lines: list[str] = []
    if facts.dips:
        for dip in facts.dips:
            dip_lines.append(f"{fmt_date(dip.logged_on)}: {DIPSTICK_LABELS.get(dip.result, dip.result)}.")
        first = facts.dips[0]
        last = facts.dips[-1]
        highest = max(facts.dips, key=lambda item: DIPSTICK_RANK.get(item.result, -1))
        dip_lines.append(
            "First "
            f"{DIPSTICK_LABELS.get(first.result, first.result)} ({fmt_date(first.logged_on)}). "
            "Last "
            f"{DIPSTICK_LABELS.get(last.result, last.result)} ({fmt_date(last.logged_on)}). "
            "Highest "
            f"{DIPSTICK_LABELS.get(highest.result, highest.result)} ({fmt_date(highest.logged_on)})."
        )

    body_lines: list[str] = []
    weights = [row for row in facts.bodies if row.weight_kg is not None]
    if weights:
        first = weights[0]
        last = weights[-1]
        lowest = min(weights, key=lambda row: row.weight_kg)
        highest = max(weights, key=lambda row: row.weight_kg)
        delta = Decimal(str(last.weight_kg)) - Decimal(str(first.weight_kg))
        sign = "+" if delta > 0 else ""
        body_lines.append(
            f"First weight {fmt_num(first.weight_kg)} kg ({fmt_date(first.log_on)}). "
            f"Last {fmt_num(last.weight_kg)} kg ({fmt_date(last.log_on)}). "
            f"Change {sign}{fmt_num(delta)} kg. "
            f"Lowest {fmt_num(lowest.weight_kg)} kg. Highest {fmt_num(highest.weight_kg)} kg."
        )
    swelling = [row for row in facts.bodies if row.oedema_score is not None]
    if swelling:
        spread = [row for row in swelling if (row.oedema_score or 0) > 0]
        peak = max(swelling, key=lambda row: row.oedema_score or 0)
        body_lines.append(
            f"Swelling logged on {len(swelling)} days, above none on {len(spread)} days. "
            f"Highest: {OEDEMA_LABELS.get(peak.oedema_score, peak.oedema_score)} ({fmt_date(peak.log_on)})."
        )

    effect_lines: list[str] = []
    grouped: dict[str, list[int]] = {}
    for effect in facts.effects:
        grouped.setdefault(effect.effect_code, []).append(effect.severity)
    for code, severities in grouped.items():
        average = sum(severities) / len(severities)
        effect_lines.append(
            f"{EFFECTS.get(code, code)}: {count_phrase(len(severities))}, average severity {average:.1f} of 3."
        )

    wellbeing_lines: list[str] = []
    if facts.checkins:
        count = len(facts.checkins)
        mood = sum(item.mood for item in facts.checkins) / count
        energy = sum(item.energy for item in facts.checkins) / count
        sleep = sum(item.sleep_quality for item in facts.checkins) / count
        lowest = min(facts.checkins, key=lambda item: (item.mood, item.log_on.toordinal()))
        wellbeing_lines.append(
            f"Average mood {mood:.1f}, energy {energy:.1f}, sleep {sleep:.1f} across {count} check-ins (scale 1–5)."
        )
        wellbeing_lines.append(f"Lowest mood: {lowest.mood} on {fmt_date(lowest.log_on)}.")

    note_lines = [f"“{note}”" for note in facts.notes]
    question_lines = [question for question in facts.questions]

    sections = [
        _section("medicines", "Medicines", medicine_lines),
        _section("taper", "Steroid taper", taper_lines),
        _section("dipstick", "Urine dipstick", dip_lines),
        _section("body", "Weight and swelling", body_lines),
        _section("side_effects", "Side effects", effect_lines),
        _section("wellbeing", "Wellbeing", wellbeing_lines),
        _section("notes", "Notes for this visit", note_lines),
        _section("questions", "Questions for the nephrologist", question_lines),
    ]
    header = [
        "RenalBuddy visit log",
        f"{fmt_date(facts.period_start)} to {fmt_date(facts.period_end)}",
        "",
        "This is a personal log of what was entered in the app. It is not medical advice. "
        "Prescribed doses are the plan that was typed in. Logged doses are what was recorded as taken.",
        "",
    ]
    chunks = []
    for section in sections:
        chunks.append(section["title"])
        chunks.extend(section["lines"])
        chunks.append("")
    text = "\n".join(header + chunks).rstrip() + "\n"
    payload = {
        "period_start": facts.period_start.isoformat(),
        "period_end": facts.period_end.isoformat(),
        "sections": sections,
    }
    return text, payload


def _day_bounds(start: date, end: date) -> tuple[datetime, datetime]:
    return datetime.combine(start, time.min), datetime.combine(end, time.max)


def load_facts(db: Session, user_id: int, start: date, end: date) -> Facts:
    events = (
        db.query(MedicationEvent, Medication)
        .join(Medication, Medication.id == MedicationEvent.medication_id)
        .filter(
            MedicationEvent.user_id == user_id,
            MedicationEvent.event_on >= start,
            MedicationEvent.event_on <= end,
        )
        .order_by(MedicationEvent.event_on, MedicationEvent.id)
        .all()
    )
    event_facts = [
        EventFact(row.event_on, row.event_type, med.name, row.dose_amount, row.dose_unit)
        for row, med in events
    ]

    dose_rows = (
        db.query(DoseLog, Medication)
        .join(Medication, Medication.id == DoseLog.medication_id)
        .filter(
            DoseLog.user_id == user_id,
            DoseLog.log_on >= start,
            DoseLog.log_on <= end,
            DoseLog.medication_id.is_not(None),
        )
        .all()
    )
    grouped_meds: dict[int, MedLogFact] = {}
    for row, med in dose_rows:
        fact = grouped_meds.get(med.id)
        if fact is None:
            fact = MedLogFact(med.name, med.dose_unit, 0, 0, [])
            grouped_meds[med.id] = fact
        if row.status == "taken":
            fact.taken += 1
        elif row.status == "missed":
            fact.missed += 1
        elif row.status == "different_dose" and row.taken_dose is not None and row.prescribed_dose is not None:
            fact.different.append((row.log_on, row.taken_dose, row.prescribed_dose))

    plans = (
        db.query(TaperPlan)
        .filter(TaperPlan.user_id == user_id)
        .order_by(TaperPlan.created_at)
        .all()
    )
    taper_facts: list[TaperFact] = []
    for plan in plans:
        steps = steps_for(db, plan.id)
        overlapping = [step for step in steps if step.start_on <= end and step.end_on >= start]
        if not overlapping and plan.status != "active":
            continue
        step_facts = []
        for step in overlapping:
            logs = (
                db.query(DoseLog)
                .filter(
                    DoseLog.user_id == user_id,
                    DoseLog.taper_step_id == step.id,
                    DoseLog.log_on >= start,
                    DoseLog.log_on <= end,
                )
                .all()
            )
            different = [
                (row.log_on, row.taken_dose, row.prescribed_dose)
                for row in logs
                if row.status == "different_dose" and row.taken_dose is not None and row.prescribed_dose is not None
            ]
            step_facts.append(
                StepFact(
                    dose_amount=step.dose_amount,
                    dose_unit=plan.dose_unit,
                    start_on=step.start_on,
                    end_on=step.end_on,
                    taken=sum(1 for row in logs if row.status == "taken"),
                    missed=sum(1 for row in logs if row.status == "missed"),
                    different=different,
                )
            )
        next_dose = None
        next_unit = None
        next_on = None
        if plan.status == "active":
            upcoming = [step for step in steps if step.start_on > end]
            if upcoming:
                nxt = min(upcoming, key=lambda step: step.start_on)
                next_dose = nxt.dose_amount
                next_unit = plan.dose_unit
                next_on = nxt.start_on
        if step_facts or (plan.status == "active" and next_on is not None):
            taper_facts.append(
                TaperFact(
                    title=plan.title,
                    status=plan.status,
                    prescribed_note=plan.prescribed_note,
                    steps=step_facts,
                    next_dose=next_dose,
                    next_unit=next_unit,
                    next_on=next_on,
                )
            )

    dip_start, dip_end = _day_bounds(start, end)
    dips = (
        db.query(DipstickLog)
        .filter(DipstickLog.user_id == user_id, DipstickLog.logged_at >= dip_start, DipstickLog.logged_at <= dip_end)
        .order_by(DipstickLog.logged_at)
        .all()
    )
    bodies = (
        db.query(BodyLog)
        .filter(BodyLog.user_id == user_id, BodyLog.log_on >= start, BodyLog.log_on <= end)
        .order_by(BodyLog.log_on)
        .all()
    )
    effects = (
        db.query(SideEffectLog)
        .filter(SideEffectLog.user_id == user_id, SideEffectLog.log_on >= start, SideEffectLog.log_on <= end)
        .order_by(SideEffectLog.log_on, SideEffectLog.effect_code)
        .all()
    )
    checkins = (
        db.query(WellbeingCheckin)
        .filter(WellbeingCheckin.user_id == user_id, WellbeingCheckin.log_on >= start, WellbeingCheckin.log_on <= end)
        .order_by(WellbeingCheckin.log_on)
        .all()
    )
    notes = (
        db.query(JournalEntry)
        .filter(
            JournalEntry.user_id == user_id,
            JournalEntry.include_in_summary.is_(True),
            JournalEntry.created_at >= dip_start,
            JournalEntry.created_at <= dip_end,
        )
        .order_by(JournalEntry.created_at)
        .all()
    )
    questions = (
        db.query(DoctorQuestion)
        .filter(DoctorQuestion.user_id == user_id, DoctorQuestion.status == "open")
        .order_by(DoctorQuestion.created_at)
        .all()
    )
    return Facts(
        period_start=start,
        period_end=end,
        events=event_facts,
        med_logs=list(grouped_meds.values()),
        tapers=taper_facts,
        dips=[DipFact(row.logged_at.date(), row.result) for row in dips],
        bodies=[BodyFact(row.log_on, row.weight_kg, row.oedema_score) for row in bodies],
        effects=[EffectFact(row.effect_code, row.severity) for row in effects],
        checkins=[
            CheckinFact(row.log_on, row.mood, row.energy, row.sleep_quality) for row in checkins
        ],
        notes=[_clip(row.body) for row in notes],
        questions=[row.body for row in questions],
    )


def _clip(text: str, limit: int = 240) -> str:
    compact = " ".join(text.split())
    if len(compact) <= limit:
        return compact
    return compact[: limit - 1].rstrip() + "…"


def build_summary(db: Session, profile: PatientProfile, start: date | None, end: date | None) -> tuple[str, dict, date, date]:
    period_start, period_end = resolve_period(profile, start, end, date.today())
    facts = load_facts(db, profile.user_id, period_start, period_end)
    text, payload = compose(facts)
    return text, payload, period_start, period_end


def save_summary(db: Session, profile: PatientProfile, start: date | None, end: date | None, commit: bool = True) -> VisitSummary:
    text, payload, period_start, period_end = build_summary(db, profile, start, end)
    row = VisitSummary(
        user_id=profile.user_id,
        period_start=period_start,
        period_end=period_end,
        summary_text=text,
        summary_json=payload,
    )
    db.add(row)
    if commit:
        db.commit()
        db.refresh(row)
    else:
        db.flush()
    return row
