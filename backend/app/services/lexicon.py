from __future__ import annotations

PHARMACIST_FALLBACK = "I'm not able to identify that medicine, please check with your pharmacist."
TYPED_PLAN_LINE = "Your typed plan is the dose to follow."

# Curated public labels / ATC-adjacent patient language. Not a dosing source.
_LEXICON: dict[str, dict[str, str]] = {
    "prednisolone": {
        "class_name": "Corticosteroid",
        "purpose": "A steroid used to reduce inflammation in kidney conditions such as nephrotic syndrome.",
    },
    "prednisone": {
        "class_name": "Corticosteroid",
        "purpose": "A steroid related to prednisolone, used to reduce inflammation in kidney conditions.",
    },
    "methylprednisolone": {
        "class_name": "Corticosteroid",
        "purpose": "A steroid sometimes used when a clinic wants a different glucocorticoid.",
    },
    "dexamethasone": {
        "class_name": "Corticosteroid",
        "purpose": "A steroid. Follow only the dates and amount your nephrologist wrote down.",
    },
    "cyclosporine": {
        "class_name": "Calcineurin inhibitor",
        "purpose": "A steroid-sparing immunosuppressant sometimes used in nephrotic syndrome.",
    },
    "ciclosporin": {
        "class_name": "Calcineurin inhibitor",
        "purpose": "A steroid-sparing immunosuppressant sometimes used in nephrotic syndrome.",
    },
    "tacrolimus": {
        "class_name": "Calcineurin inhibitor",
        "purpose": "A steroid-sparing immunosuppressant sometimes used when steroids alone are not enough.",
    },
    "mycophenolate": {
        "class_name": "Immunosuppressant",
        "purpose": "A medicine that dampens the immune system. Clinics may use it to spare steroids.",
    },
    "mycophenolate mofetil": {
        "class_name": "Immunosuppressant",
        "purpose": "A medicine that dampens the immune system. Clinics may use it to spare steroids.",
    },
    "mmf": {
        "class_name": "Immunosuppressant",
        "purpose": "Short name for mycophenolate mofetil, used to dampen the immune system.",
    },
    "cyclophosphamide": {
        "class_name": "Alkylating immunosuppressant",
        "purpose": "A stronger immunosuppressant used only when a nephrologist prescribes it.",
    },
    "rituximab": {
        "class_name": "Monoclonal antibody",
        "purpose": "An infusion medicine used in some difficult nephrotic syndrome courses.",
    },
    "lisinopril": {
        "class_name": "ACE inhibitor",
        "purpose": "A blood-pressure and kidney-protecting tablet. It is not a steroid.",
    },
    "enalapril": {
        "class_name": "ACE inhibitor",
        "purpose": "A blood-pressure and kidney-protecting tablet. It is not a steroid.",
    },
    "ramipril": {
        "class_name": "ACE inhibitor",
        "purpose": "A blood-pressure and kidney-protecting tablet. It is not a steroid.",
    },
    "losartan": {
        "class_name": "Angiotensin receptor blocker",
        "purpose": "A blood-pressure and kidney-protecting tablet. It is not a steroid.",
    },
    "furosemide": {
        "class_name": "Loop diuretic",
        "purpose": "A water tablet used to help the body lose extra fluid when a clinic prescribes it.",
    },
    "frusemide": {
        "class_name": "Loop diuretic",
        "purpose": "A water tablet used to help the body lose extra fluid when a clinic prescribes it.",
    },
    "famotidine": {
        "class_name": "H2 blocker",
        "purpose": "A stomach-acid reducer. Clinics sometimes prescribe it with steroids to help protect the stomach.",
    },
}


def _key(name: str) -> str:
    return " ".join(name.strip().lower().split())


def explain_medicine(name: str) -> dict:
    raw = name.strip()
    entry = _LEXICON.get(_key(raw))
    if entry is None:
        return {
            "name": raw,
            "known": False,
            "class_name": None,
            "purpose": PHARMACIST_FALLBACK,
            "dose_note": TYPED_PLAN_LINE,
        }
    return {
        "name": raw,
        "known": True,
        "class_name": entry["class_name"],
        "purpose": entry["purpose"],
        "dose_note": TYPED_PLAN_LINE,
    }
