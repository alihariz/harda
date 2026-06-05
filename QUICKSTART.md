# HARDA — Quick Start

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Git

---

## 1. Clone

```bash
git clone https://github.com/jessiechang03/HARDA-CI-CD.git
cd HARDA-CI-CD
```

---

## 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create the `.env` file:

```bash
cp .env.example .env
```

Edit `.env` — minimum required values:

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/harda_db
SECRET_KEY=any-random-string
JWT_SECRET_KEY=another-random-string
FLASK_ENV=development
YOLO_MODEL_PATH=ml/weights/yolov8n.pt
YOLO_CONFIDENCE_THRESHOLD=0.70
UPLOAD_FOLDER=uploads/
MAX_CONTENT_LENGTH=10485760
```

Create the database in PostgreSQL, then run migrations and seed data:

```bash
# create the DB first (psql or pgAdmin)
# CREATE DATABASE harda_db;

flask db upgrade
python seeds.py
python run.py
```

API is now running at `http://localhost:5000`.

Smoke check: `curl http://localhost:5000/api/v1/detection/model-info`

---

## 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

> The app works without a Maps key but the hazard map page won't render.

```bash
npm run dev
```

Web app is now at `http://localhost:5173`.

---

## Demo accounts (after `python seeds.py`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@harda.my | Admin123! |
| Public user | user@harda.my | User123! |
| Field crew (KL) | crew_kl@harda.my | Crew123! |
| Field crew (Johor) | crew_johor@harda.my | Crew123! |

---

---

## Production / Homelab deployment (Docker)

**Prerequisites:** Docker + Docker Compose installed on your homelab server.

```bash
git clone https://github.com/jessiechang03/HARDA-CI-CD.git
cd HARDA-CI-CD

# 1. Create your env file
cp .env.example .env
# Edit .env — fill in POSTGRES_PASSWORD, SECRET_KEY, JWT_SECRET_KEY,
# GOOGLE_MAPS_API_KEY, VITE_GOOGLE_MAPS_API_KEY, and VITE_API_BASE_URL

# 2. Build and start all services
docker compose up -d --build
```

Services:
- Frontend (web app): `http://YOUR_HOMELAB_IP`
- Backend (API): `http://YOUR_HOMELAB_IP:5000`

Migrations and seed data run automatically on first boot via `entrypoint.sh`.

**To view logs:**
```bash
docker compose logs -f backend
```

**To stop:**
```bash
docker compose down
```

**Data is persisted** in Docker volumes (`postgres_data`, `uploads_data`) — safe across restarts and `down/up` cycles. To fully reset: `docker compose down -v`.

---

## Mobile APK (for physical device install)

The mobile app is built with Expo. Use **EAS Build** (free tier, cloud — no Android Studio needed):

```bash
cd mobile
npm install -g eas-cli
eas login                        # create a free Expo account if needed
eas build:configure              # generates eas.json (first time only)

# Store your Maps key as an EAS secret (replaces the placeholder in app.config.js)
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "your-key"

# Build an APK (Android — installable directly)
eas build --platform android --profile preview
```

Once the build finishes, EAS gives you a download link. Install the `.apk` on any Android device — no Play Store needed.

> **For iOS:** use `--platform ios` and you'll need an Apple Developer account for device distribution.

---

## Project structure

```
HARDA-CI-CD/
├── backend/     Flask REST API + PostgreSQL
├── frontend/    React.js web app (map + admin dashboard)
├── mobile/      React Native + Expo mobile app
└── ml/          YOLO inference + fine-tuning notebook
```
