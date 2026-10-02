from __future__ import annotations

from collections import defaultdict
from time import time

from fastapi import HTTPException, Request

_hits: dict[str, list[float]] = defaultdict(list)


def rate_limit(request: Request, *, limit: int = 8, window_seconds: int = 60) -> None:
    host = request.client.host if request.client else "unknown"
    key = f"{host}:{request.url.path}"
    now = time()
    recent = [stamp for stamp in _hits[key] if now - stamp < window_seconds]
    if len(recent) >= limit:
        raise HTTPException(status_code=429, detail="Too many attempts. Try again in a minute.")
    recent.append(now)
    _hits[key] = recent
