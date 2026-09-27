DISCLAIMER = (
    "RenalBuddy stores what you enter and the plan your nephrologist already prescribed. "
    "It does not give medical advice, calculate doses, or decide whether a dipstick means a relapse."
)

EFFECTS = {
    "sleep": "Sleep problems",
    "mood": "Mood changes",
    "appetite": "Appetite changes",
    "stomach": "Stomach upset",
    "face_swelling": "Face swelling",
    "acne": "Acne or skin changes",
    "infection_concern": "Infection concern",
    "other": "Other",
}

DIPSTICKS = ("neg", "trace", "1+", "2+", "3+", "4+")
DIPSTICK_LABELS = {
    "neg": "negative",
    "trace": "trace",
    "1+": "1+",
    "2+": "2+",
    "3+": "3+",
    "4+": "4+",
}
DIPSTICK_RANK = {code: index for index, code in enumerate(DIPSTICKS)}

OEDEMA_LABELS = {
    0: "none",
    1: "ankles",
    2: "legs",
    3: "more widespread",
}

INTERESTS = ("walking", "music", "breathing", "rest", "talking", "reading")

SCHEDULES = ("daily", "twice_daily", "as_needed")
DOSE_STATUSES = ("taken", "missed", "different_dose")
SLOTS = ("daily", "morning", "evening")

RESOURCES = [
    {
        "title": "NephCure",
        "url": "https://nephcure.org/",
        "description": "Patient community and education for nephrotic syndrome and rare kidney disease.",
    },
    {
        "title": "National Kidney Foundation",
        "url": "https://www.kidney.org/",
        "description": "Kidney disease information, support programs, and patient resources.",
    },
    {
        "title": "Kidney Care UK",
        "url": "https://www.kidneycareuk.org/",
        "description": "UK support, information, and community for people with kidney conditions.",
    },
    {
        "title": "American Kidney Fund",
        "url": "https://www.kidneyfund.org/",
        "description": "Education and assistance programs for people living with kidney disease.",
    },
    {
        "title": "infoKID",
        "url": "https://www.infokid.org.uk/",
        "description": "Plain-language kidney information for children, young people, and families.",
    },
]
