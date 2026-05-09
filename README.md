# Recipe Finder

A pantry-to-recipe matcher: enter (or photograph) the ingredients you have, and the app ranks ~13k recipes by how much of each one you can already make. Recipe ranking runs through a native C++ scoring engine called from Node.js. Optional ingredient detection from a photo or live webcam uses YOLOv8.

## Architecture

```
recipe-frontend/   React + Vite + TypeScript UI
recipe-backend/    Express + TypeScript API
  src/index.ts       Routes: /api/health, /api/search, /api/detect, /api/test-cpp
  src/setupDb.ts     Creates Postgres tables
  src/addon/         C++ matcher (compiled to native .node module via node-gyp)
  detect.py          YOLOv8 ingredient detection (spawned by /api/detect)
  seed_local.py      Loads recipes_data.csv into Postgres
```

Stack: Node 20+, PostgreSQL 18, Python 3.10+ (with `ultralytics`, `opencv`, `psycopg2`, `pandas`, `python-dotenv`).

## Prerequisites

- Node.js 20+
- PostgreSQL (installer: <https://www.postgresql.org/download/windows/>) — must be running as a Windows service
- Python 3.10+ with a virtualenv at the repo root (`.venv/`)
- A C++ build toolchain for `node-gyp` (Visual Studio Build Tools on Windows)
- The RecipeNLG CSV (`recipes_data.csv`) placed in `recipe-backend/`

## Setup

### 1. Backend dependencies

```powershell
cd recipe-backend
npm install
```

This also compiles the C++ matcher addon (`build/Release/matcher.node`).

### 2. Python venv

From the repo root:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install ultralytics opencv-python pandas psycopg2-binary python-dotenv
```

### 3. Configure `.env`

Create `recipe-backend/.env`:

```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=<your-postgres-password>
DB_NAME=postgres
DB_PORT=5432
DB_SSL=false
PYTHON_PATH=C:\path\to\repo\.venv\Scripts\python.exe
```

`PYTHON_PATH` must point at the venv's `python.exe` so the backend spawns the interpreter that has `ultralytics` installed.

### 4. Create tables and seed

```powershell
cd recipe-backend
node --loader ts-node/esm src/setupDb.ts
python seed_local.py
```

`seed_local.py` reads the first 13k rows from `recipes_data.csv` and inserts them. Adjust `ROW_LIMIT` in the script to change.

### 5. Run

In two terminals:

```powershell
# backend
cd recipe-backend
node --loader ts-node/esm src/index.ts

# frontend
cd recipe-frontend
npm install
npm run dev
```

Open the URL Vite prints (default <http://localhost:5173>). The backend listens on <http://localhost:3001>.

## Features

- **Pantry input** — type ingredients or paste a list
- **Photo upload** — pick an image, server runs YOLOv8, detected items get added to the pantry
- **Live camera capture** — opens the webcam in-browser; click capture to snap a frame and send to detection
- **C++ ranking** — `/api/search` runs every recipe through a native matcher and returns the top 50 scored
- **Recipe modal** — click any result for full ingredients + instructions; CSS-rendered placeholder when no image is available
- **Theme toggle** — light/dark, persisted to localStorage

## Known limitations

- **YOLOv8 stock model** only knows ~10 food classes (`apple`, `banana`, `orange`, `broccoli`, `carrot`, `pizza`, `sandwich`, `hot dog`, `cake`, `donut`). For real fridge content detection, train a custom model with `train_yolo.py` against a labeled dataset and swap `'yolov8n.pt'` in `detect.py` for the trained `best.pt`.
- **No recipe images** — the seeded RecipeNLG dataset has no image data, so all recipe cards use a CSS gradient placeholder. The original Kaggle dataset (`Food Ingredients and Recipe Dataset with Image Name Mapping.csv`, with images) can be re-seeded if needed by adapting `seed_db.py`.
- **`getUserMedia` requires a secure context.** Live camera works on `localhost` and over HTTPS, but not from a plain `http://` LAN address.

## API

| Route | Method | Body | Returns |
|---|---|---|---|
| `/api/health` | GET | — | `{ message, db_time }` |
| `/api/search?ingredients=a,b,c` | GET | — | Top 50 recipes sorted by C++ match score |
| `/api/detect` | POST | `multipart/form-data` with `image` field | `{ ingredients: string[] }` |
| `/api/test-cpp` | GET | — | Sample C++ matcher output |
