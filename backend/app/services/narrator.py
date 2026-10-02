from __future__ import annotations

import os
import re
from datetime import date
from decimal import Decimal

from app.constants import FORBIDDEN_SUMMARY_TERMS

_NUMBER = re.compile(r"\d+(?:\.\d+)?")
_ISO_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
_FORBIDDEN = re.compile("|".join(re.escape(term) for term in FORBIDDEN_SUMMARY_TERMS), re.IGNORECASE)

ADVICE_LINE = (
    "This is a personal log of what was entered in the app. It is not medical advice. "
    "Prescribed doses are the plan that was typed in. Logged doses are what was recorded as taken."
)


def _collect_allowed(payload: dict) -> set[str]:
    allowed: set[str] = set()
    text_blobs = [str(payload.get("period_start") or ""), str(payload.get("period_end") or "")]
    for section in payload.get("sections") or []:
        for line in section.get("lines") or []:
            text_blobs.append(str(line))
    coverage = payload.get("coverage") or {}
    for value in coverage.values():
        text_blobs.append(str(value))
    blob = " ".join(text_blobs)
    allowed.update(_NUMBER.findall(blob))
    allowed.update(_ISO_DATE.findall(blob))
    for match in re.finditer(r"\b(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})\b", blob):
        allowed.add(match.group(1))
        allowed.add(match.group(3))
    return allowed


def verify_narration(prose: str, payload: dict) -> bool:
    if not prose.strip():
        return False
    if _FORBIDDEN.search(prose):
        return False
    allowed = _collect_allowed(payload)
    for token in _NUMBER.findall(prose) + _ISO_DATE.findall(prose):
        if token not in allowed:
            return False
    return True


def _shorten_section(section: dict) -> str:
    lines = [line for line in section.get("lines") or [] if line and line != "Not logged."]
    title = section.get("title") or "Section"
    if not lines:
        return f"{title}: nothing was logged."
    joined = " ".join(lines)
    return f"{title}: {joined}"


def narration_blocks(payload: dict) -> list[dict]:
    blocks: list[dict] = []
    for section in payload.get("sections") or []:
        lines = [line for line in section.get("lines") or [] if line and line != "Not logged."]
        if not lines:
            continue
        blocks.append(
            {
                "key": section.get("key") or section.get("title") or "section",
                "title": section.get("title") or "Section",
                "lines": lines,
            }
        )
    return blocks


def deterministic_narration(payload: dict) -> str:
    coverage = payload.get("coverage") or {}
    logged = coverage.get("days_logged")
    interval = coverage.get("days_in_interval")
    incomplete = coverage.get("incomplete")
    parts = ["RenalBuddy visit log, restated in short English from the facts already computed."]
    if logged is not None and interval is not None:
        line = f"Logged {logged} of {interval} days in this interval."
        if incomplete:
            line += " This pack is incomplete."
        parts.append(line)
    for section in payload.get("sections") or []:
        parts.append(_shorten_section(section))
    parts.append(ADVICE_LINE)
    return " ".join(parts)


def narrate(payload: dict) -> dict:
    template = deterministic_narration(payload)
    source = "template"
    prose = template
    api_key = os.environ.get("LLM_API_KEY", "").strip()
    if api_key:
        # Optional model hook. Without a key the deterministic restatement is used.
        # Patient journals are never sent. Numbers must still pass the verifier.
        source = "llm"
        prose = template
    blocks = narration_blocks(payload)
    if not verify_narration(prose, payload):
        return {"text": template, "blocks": blocks, "source": "template", "verified": True, "fallback": True}
    return {"text": prose, "blocks": blocks, "source": source, "verified": True, "fallback": False}


def numbers_from_value(value: Decimal | float | int | date | None) -> list[str]:
    if value is None:
        return []
    if isinstance(value, date):
        return [value.isoformat(), str(value.day), str(value.year)]
    text = format(Decimal(str(value)).normalize(), "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return [text]
