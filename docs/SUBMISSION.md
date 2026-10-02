# Healthcare track — submission reference

Use these when filling the official form. Upload the PPT from this repo separately (the form field does not pull from GitHub).

## URLs

| Field | Value |
| --- | --- |
| Project web link | https://renalbuddy.onrender.com |
| GitHub | https://github.com/MarcusAngTan/RenalBuddy |
| Architecture diagram (PPT) | `docs/RenalBuddy_Architecture_Trust_Boundary.pptx` |

## Copy-paste

**Project title:** RenalBuddy

**Short blurb (≤10 words):** Between nephrology visits: log taper, dips, clinic summary.

**Judge path (~3 min):** Live URL → **Sign in as demo** → **Today** → **Demo data** → **Visit** → copy summary.

**Stack:** React PWA + FastAPI + MySQL (TiDB Serverless) on Render free tier. No `LLM_API_KEY` in production; visit text uses verified template narration. See [`architecture.md`](architecture.md).

## Pre-submit checklist

- [ ] https://renalbuddy.onrender.com/api/health returns `{"status":"ok"}`
- [ ] Demo path works on a phone-width browser
- [ ] PPT uploaded to the form
- [ ] Repo is public; no secrets committed
