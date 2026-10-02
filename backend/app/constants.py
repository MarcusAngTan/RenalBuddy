DISCLAIMER = (
    "RenalBuddy stores what you enter and the plan your nephrologist already prescribed. "
    "It does not give medical advice, calculate doses, or decide whether a dipstick means a relapse."
)

DEMO_USER_EMAIL = "ada.demo@example.com"
DEMO_USER_PASSWORD = "password123"

CRISIS_COPY = (
    "If you feel unsafe, call 995. You can also call Samaritans of Singapore on 1767, "
    "or contact the Institute of Mental Health. International helplines are listed at iasp.info."
)

FORBIDDEN_SUMMARY_TERMS = ("relapse", "remission", "you should", "recommended")

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
LOG_FOR_OPTIONS = ("self", "child")

SCHEDULES = ("daily", "twice_daily", "as_needed")
DOSE_STATUSES = ("taken", "missed", "different_dose")
SLOTS = ("daily", "morning", "evening")

RESOURCES = [
    {
        "title": "NUH Children’s Kidney Patient Support Group",
        "url": "https://www.nuh.com.sg/care-at-nuh/services/paediatrics/paediatric-nephrology-dialysis-and-renal-transplantation",
        "description": "Paediatric nephrology at NUH, including the Children’s Kidney Patient Support Group (camp, workshops). Contact on the page: 6772 2447.",
    },
    {
        "title": "KKH Nephrology Service",
        "url": "https://www.kkh.com.sg/our-specialties/nephrology",
        "description": "KK Women’s and Children’s Hospital — assessment and care for childhood nephrotic syndrome and other kidney conditions.",
    },
    {
        "title": "National Kidney Foundation Singapore",
        "url": "https://nkfs.org/",
        "description": "Singapore kidney charity — education, patient programmes, and dialysis support (mostly CKD and kidney failure, not nephrotic syndrome alone).",
    },
    {
        "title": "NKF patient and caregiver support",
        "url": "https://nkfs.org/series/patient-caregiver-support/",
        "description": "Stories and programmes from NKF Singapore for patients and caregivers on dialysis and related kidney journeys.",
    },
    {
        "title": "Samaritans of Singapore (SOS)",
        "url": "https://www.sos.org.sg/",
        "description": "24-hour emotional support in Singapore. Hotline 1767 · CareText WhatsApp 9151 1767. For emergencies call 995.",
    },
    {
        "title": "NephCure",
        "url": "https://nephcure.org/what-is-nephrotic-syndrome/",
        "description": "English overview of nephrotic syndrome — symptoms, diagnosis, and living with NS (US-based charity).",
    },
    {
        "title": "infoKID — nephrotic syndrome",
        "url": "https://infokid.org.uk/conditions/nephrotic-syndrome/",
        "description": "Plain-language UK information for families — steroids, relapses, home urine testing, and clinic follow-up.",
    },
]
