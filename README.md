# RenalBuddy

RenalBuddy is a mobile-first web log for nephrotic syndrome patients between nephrologist visits. You enter the prescribed plan, check in each day, and take a visit summary to the next appointment.

The app stores what you type. It does not calculate doses, recommend a taper, or label a relapse.

## How to log in

1. Start MySQL, the API, and the website (steps below).
2. Open **http://localhost:5173** in a browser.
3. You should land on **Sign in**. If you see **Create your log**, you are on the register page.
4. Use the demo account, or create a new one.

**Demo account**

- Email: `ada.demo@example.com`
- Password: `password123`

5. After sign in, the **Today** tab is the home screen. Use the bottom tabs for **Meds**, **Feel**, and **Visit**. **Profile** is at the top right.

**New account**

1. Open **http://localhost:5173/register**.
2. Enter a name, email, and password (at least 8 characters).
3. Tick the disclaimer checkbox. Create account stays disabled until you do.
4. Finish setup (appointment dates, medicines, taper, interests). You can skip steps and complete them later.

If the page stays on **Loading…** or sign in fails, the API is not running or cannot reach MySQL. Check the API terminal for `Application startup complete`.

## What you need installed

- Python 3.12 or 3.13
- Node.js 20 or newer (this repo was built with Node 24)
- MySQL 8, or Docker Desktop if you use Compose
- npm

Python packages live in [`backend/requirements.txt`](backend/requirements.txt). Frontend packages live in [`frontend/package.json`](frontend/package.json) and are installed with `npm install`.

## Run the app (three terminals)

Copy the env file once, then create the Python environment once.

```bash
cd backend
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

On this Mac, `backend/.env` uses MySQL on **port 3307** with user `renalbuddy` / password `renalbuddy`. That is a separate project database. The system MySQL on port 3306 does not have that login.

### Terminal 1 — MySQL (port 3307)

```bash
/usr/local/mysql/bin/mysqld --datadir=/tmp/renalbuddy-mysql --port=3307 --socket=/tmp/renalbuddy.sock --pid-file=/tmp/renalbuddy.pid --bind-address=127.0.0.1 --mysqlx=0
```

Wait until the log says `ready for connections`. This data directory is under `/tmp`, so a restart can wipe it.

If this is a fresh data directory, create the database once:

```bash
/usr/local/mysql/bin/mysql --socket=/tmp/renalbuddy.sock -u root -e "CREATE DATABASE IF NOT EXISTS renalbuddy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'renalbuddy'@'localhost' IDENTIFIED BY 'renalbuddy'; GRANT ALL PRIVILEGES ON renalbuddy.* TO 'renalbuddy'@'localhost'; FLUSH PRIVILEGES;"
cd backend
source .venv/bin/activate
alembic upgrade head
```

### Terminal 2 — API (port 8000)

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

You want `Application startup complete` and `Uvicorn running on http://127.0.0.1:8000`.

If you see `Application startup failed`, MySQL on port 3307 is not running. If you see `Address already in use`, stop the old API with Ctrl+C in that terminal.

### Terminal 3 — website (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

The Vite server proxies `/api` to the FastAPI app. Keep both servers running while you use the site.

## Docker (optional)

If Docker is installed, Compose starts MySQL 8 and the API. Compose MySQL is on **port 3306** inside Docker, not the 3307 local setup above.

```bash
docker compose up --build
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5173**. For that path, set `backend/.env` `DATABASE_URL` to port 3306 only if you are talking to the Compose database from a locally run API.

## Demo path

On an empty account, **Today** has **Load sample week**. That adds a 4-step prednisolone taper, lisinopril, three logged days, a journal note, and a question for the nephrologist. Open **Visit** to copy the summary.

## Safety

RenalBuddy is a personal log, not medical advice. Prescribed doses are the plan you typed in. Logged doses are what was recorded as taken.
