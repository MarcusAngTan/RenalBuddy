from app.constants import INTERESTS

SUGGESTIONS = [
    {
        "id": "walk",
        "tags": ["walking"],
        "title": "A short walk",
        "body": "Ten minutes outside, at an easy pace. Stop if you feel unwell, dizzy, or short of breath.",
    },
    {
        "id": "music",
        "tags": ["music"],
        "title": "One song you like",
        "body": "Play a song that usually steadies you. You do not have to do anything else while it plays.",
    },
    {
        "id": "breath",
        "tags": ["breathing"],
        "title": "Slow breathing",
        "body": "Breathe in for four counts and out for six. Repeat that five times, sitting down.",
    },
    {
        "id": "rest",
        "tags": ["rest"],
        "title": "Rest without catching up",
        "body": "Lie down for fifteen minutes. Leave the list of tasks until the time is up.",
    },
    {
        "id": "talk",
        "tags": ["talking"],
        "title": "Text one person",
        "body": "Send a short message to someone who knows you are dealing with this illness.",
    },
    {
        "id": "read",
        "tags": ["reading"],
        "title": "A few pages",
        "body": "Read something that is not about your health. Stop when you want to, not at a target.",
    },
]


def suggestions_for(tags: list[str] | None) -> tuple[list[dict], bool]:
    chosen = [tag for tag in (tags or []) if tag in INTERESTS]
    matched = [item for item in SUGGESTIONS if set(item["tags"]).intersection(chosen)]
    if matched:
        return matched, False
    defaults = [item for item in SUGGESTIONS if item["id"] in {"breath", "rest"}]
    return defaults, True
