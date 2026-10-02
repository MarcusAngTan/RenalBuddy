# RenalBuddy

RenalBuddy is a **mobile-first web app** for people living with **nephrotic syndrome** (or a related glomerular disease) between nephrology visits. You type the plan the clinic already gave you, check in at home on protein, weight, swelling, medicines, and how you feel, then open **Visit** for a structured summary to take to the next appointment.

It is a personal log, not medical advice. It does **not** calculate a dose, invent a taper, read a dipstick by camera, or label protein as relapse or remission. Optional AI only restates facts you already logged (see [Safety](#safety)).

Trust boundaries and system overview: [`docs/architecture.md`](docs/architecture.md).

## Live demo (public HTTPS)

After you deploy (see [Deploy on Render (free)](#deploy-on-render-free)), put the URL here:

**`https://your-service.onrender.com`** (replace after deploy)

**Try it (judges, ~3 minutes):** open the URL → **Create an account** → on **Today**, tap **Demo data** → open **Visit** → **Copy summary** or **Hand the phone over**.

Free Render instances **sleep when idle**; the first load after sleep can take **30–60 seconds**—refresh once if the page is slow. Do **not** set `LLM_API_KEY` in production; narration uses verified template text only.

## What you use it for

| Between visits | In the app |
| --- | --- |
| Steroid or immunosuppressant **taper** on a letter or printout | **Plan** (`/taper`) — enter steps; **Today** shows today’s prescribed dose; log taken / missed / different |
| Home monitoring (dipstick square, weight, swelling) | **Today** — daily check-in |
| Mood, sleep, energy, isolation | **Feel** — wellbeing and links to named support organisations (no in-app forum) |
| The **15-minute follow-up** | **Visit** — interval pack: medicines, taper, dipstick, body, side effects, wellbeing, notes, questions; copy text or **Hand the phone over** |

Bottom tabs: **Today**, **Meds**, **Feel**, **Visit**. **Profile** (top right) holds appointment dates and account tools. From **Feel** you can open **Journal**, **Questions**, and **Support**. From **Today**, shortcuts include **Plan** (taper).

## Open the web app (follow along)

You need **two processes**: the API + database, and the Vite dev server (the UI). The UI is what you open in the browser; it talks to the API through a proxy.

### What to install

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended for MySQL + API), **or** MySQL 8 and Python 3.12+ yourself
- **Node.js 20+** and `npm` (for the frontend)
- A modern browser (Chrome, Safari, Firefox, Edge)

### Step 1 — API and database (Terminal 1)

From the repo root:

```bash
docker compose up --build
```

Wait until the `api` service is up. The API listens on **http://127.0.0.1:8000**. Quick check:

```bash
curl -s http://127.0.0.1:8000/api/health
```

You should see `{"status":"ok"}`.

Compose sets a local `JWT_SECRET` for development only. For anything public or judged, set a strong secret in `docker-compose.yml` under the `api` service `environment`.

### Step 2 — Website (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Vite prints a local URL, usually **http://localhost:5173**. Open that in your browser. The dev server proxies `/api` to port 8000, so keep **both** Terminal 1 and Terminal 2 running while you use the app.

### Step 3 — Create an account

1. Go to **http://localhost:5173/register** (or choose **Create an account** from sign-in).
2. Enter name, email, and password (at least 8 characters).
3. Accept the disclaimer — **Create account** stays disabled until you do.
4. Complete **setup** (appointment dates, medicines, taper, interests) or skip and fill them later under **Profile** and **Plan**.

There is no pre-seeded login in the database. The **Demo data** button on the sign-in screen only fills example email and password (`ada.demo@example.com` / `password123`); that works **after** you register once with those credentials. Easiest path: register with any email you like.

### Step 4 — Try the nephrotic-syndrome demo path (~3 minutes)

On an account with **no** medicines or taper yet:

1. On **Today**, tap **Demo data**. This loads a sample prednisolone taper, cyclosporine, a few logged days, a journal note, and a question for the nephrologist (only on an empty clinical log).
2. Open the **Visit** tab. Review the interval summary.
3. Use **Copy summary** or **Hand the phone over** to show the pack full-screen.
4. Optionally tap **Save summary** or **Close visit** to roll the appointment window forward (set last/next appointment dates in **Profile** first if needed).

For a real log: add your clinic plan under **Meds** and **Plan**, then use **Today** each day until the next appointment.

### Step 5 — Use it like an app on your phone (optional)

The UI is built for phone-sized screens (`manifest.json`, standalone display). For local development on a phone on the same Wi‑Fi:

```bash
cd frontend
npm run dev -- --host
```

Open the URL Vite prints (your computer’s LAN address, port 5173). The phone must reach your machine’s API on port 8000 — for a quick demo, use the desktop browser first; production would serve frontend and API behind HTTPS on one host.

On iOS Safari or Android Chrome, you can use **Add to Home Screen** / **Install app** so RenalBuddy opens in its own window.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| **Loading…** forever or sign-in fails | API not running, or database not ready. Terminal 1: `docker compose up --build`. Look for `Application startup complete` on the API. |
| **Could not sign in** with demo email | Register that email once at `/register`, or use your own account and **Demo data** on **Today**. |
| **Demo data** errors | Sample week only loads when the account has no clinical data yet. Use a new account or delete data from **Profile**. |
| Port **8000** in use | Stop the other process or change the host port in `docker-compose.yml`. |
| Port **5173** in use | Stop the other Vite dev server or set another port: `npm run dev -- --port 5174`. |

## Deploy on Render (free)

One HTTPS URL serves the built React app and `/api` from the same FastAPI process (`Dockerfile` at repo root). Database: [TiDB Cloud Serverless](https://tidbcloud.com/) free tier (MySQL-compatible) so existing Alembic migrations and `mysql+pymysql` keep working.

### 1. TiDB Serverless

1. Create a free cluster and database named `renalbuddy`.
2. Create a user and password; copy the **MySQL** connection string (host, port, TLS as shown in TiDB).
3. Format for the app:  
   `mysql+pymysql://USER:PASSWORD@HOST:PORT/renalbuddy?charset=utf8mb4`  
   Add TiDB’s SSL parameters if their console requires them (see TiDB “Connect” docs for SQLAlchemy/PyMySQL).

### 2. Render web service

1. [Render](https://render.com) → **New** → **Blueprint** (or **Web Service** → connect this GitHub repo).
2. Use [`render.yaml`](render.yaml): Docker build from repo root, health check `/api/health`.
3. Environment variables:
   - `DATABASE_URL` — TiDB string from step 1.
   - `JWT_SECRET` — long random string (32+ bytes); Render can generate one.
   - `CORS_ORIGINS` — your exact public origin only, e.g. `https://renalbuddy.onrender.com` (no trailing slash).
   - Leave **`LLM_API_KEY` unset**.
4. Deploy. Migrations run on container start (`alembic upgrade head`).

### 3. Smoke test

```bash
curl -s https://<your-service>.onrender.com/api/health
```

Register in the browser, use **Demo data** on **Today**, open **Visit**. Update the [Live demo](#live-demo-public-https) URL in this README to match the form submission.

**Local production-like build (optional):**

```bash
docker build -t renalbuddy .
docker run --rm -p 8000:8000 \
  -e DATABASE_URL='mysql+pymysql://...' \
  -e JWT_SECRET='local-prod-test-secret-min-32-chars' \
  -e CORS_ORIGINS='http://127.0.0.1:8000' \
  renalbuddy
```

Open **http://127.0.0.1:8000** (UI and API same origin).

**Avoid for judging:** ngrok-only links, exposing compose default DB passwords on the public internet, or enabling an LLM without the existing verifier (not needed for demo).

**If TiDB signup is blocked:** use [Neon](https://neon.tech) Postgres free tier, add `psycopg2-binary` to `backend/requirements.txt`, and set `DATABASE_URL` to `postgresql+psycopg2://...` (migrations are generic SQLAlchemy).

## Run without Docker (advanced)

If you prefer a local MySQL instead of Compose:

1. `cd backend && cp .env.example .env` — set `JWT_SECRET` to a long random string (required).
2. Point `DATABASE_URL` in `.env` at your MySQL (`renalbuddy` database, user/password as you created them). The example file uses **port 3306**.
3. `python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
4. `alembic upgrade head`
5. `uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`
6. Start the frontend as in Step 2 above.

Keep MySQL data in a **persistent** data directory, not `/tmp`, so your log survives restarts.

If you already run a project-specific MySQL on another port (for example **3307** on this Mac), set `DATABASE_URL` in `backend/.env` to match that port. Compose uses **3306** on the host when you `docker compose up`.

## What AI does, and does not do

- **Does:** restate the visit pack in shorter English; explain a known medicine in patient language; suggest a question you may add to your list.
- **Does not:** calculate a dose, write a taper, name relapse or remission, tell you to start/stop/skip a medicine, or email a clinician.
- If the narrator invents a number, the verifier discards it and the template text is shown instead.

## Safety

RenalBuddy is a personal log, not medical advice. Prescribed doses are the plan you typed in. Logged doses are what you recorded as taken. This app will not tell you when to call your team. **Feel** shows a crisis note when mood is at the lowest step; it uses fixed Singapore helpline numbers, not generated text.
