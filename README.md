🎵 Cadenza – Private Music Teacher App

A modern, agent-first music studio management platform for private teachers.
Includes a FastAPI backend with a conflict resolution engine, a React (CDN)
frontend dashboard, COPPA-compliant PostgreSQL schema with Row-Level Security,
MCP agentic tool specs, and a database seeding script.

Project Structure

music-teacher-app/
├── README.md                         ← You are here
├── architecture_blueprint.md         ← Full architecture design & MCP specs
│
├── db/
│   ├── schema.sql                    ← PostgreSQL DDL with RLS policies
│   └── seed_data.py                  ← Mock data seeding script (SQLite + PostgreSQL)
│
├── backend/
│   ├── requirements.txt              ← Python dependencies
│   └── app/
│       ├── main.py                   ← FastAPI app, REST endpoints, MCP tool schemas
│       ├── schemas.py                ← Pydantic request/response models
│       └── core/
│           └── conflict_resolution.py ← RRULE expansion & conflict engine
│
└── frontend/
    └── index.html                    ← Full React app via CDN (no build step needed)

Prerequisites

| Tool        | Required | Notes                                            |
| ----------- | -------- | ------------------------------------------------ |
| **Python**  | ≥ 3.10   | Already installed on your system                 |
| **pip**     | any      | For backend dependencies                         |
| **Browser** | any      | Chrome/Firefox/Edge to open the frontend         |
| PostgreSQL  | Optional | Only needed if using a real DB (SQLite included) |

1. Run the Backend (FastAPI)

Install Dependencies

cd C:\Users\Jason\.gemini\antigravity\scratch\music-teacher-app\backend
pip install -r requirements.txt

Start the Server

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

The API will be live at: http://localhost:8000

| URL                                  | Description                             |
| ------------------------------------ | --------------------------------------- |
| `http://localhost:8000/docs`         | Interactive Swagger UI (auto-generated) |
| `http://localhost:8000/redoc`        | ReDoc API Reference                     |
| `http://localhost:8000/mcp/tools`    | MCP tool schema endpoint for AI agents  |
| `http://localhost:8000/api/lessons`  | List scheduled lessons                  |
| `http://localhost:8000/api/students` | List student profiles                   |
| `http://localhost:8000/api/drafts`   | List communication drafts               |

CORS is already configured to allow * origins so the frontend can connect
locally without issues.

2. Run the Frontend

The frontend is a zero-build-step, self-contained HTML file using React 18 +
Tailwind CSS via CDN. No npm/Node.js installation needed.

Open directly in your browser

# Simply double-click the file, or run:
start C:\Users\Jason\.gemini\antigravity\scratch\music-teacher-app\frontend\index.html

💡 Tip: If you have Python installed, you can also serve it from localhost to
avoid CORS quirks:

cd C:\Users\Jason\.gemini\antigravity\scratch\music-teacher-app\frontend
python -m http.server 3000
# Then open: http://localhost:3000

Frontend Views

| Tab                     | Description                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Teacher View**        | Calendar grid, lesson scheduler with real-time conflict detection, density-based slot recommender, communication draft composer & approval panel |
| **Parent/Student View** | Upcoming lesson countdown, interactive daily practice log timer, assigned pieces checklist, milestone progress tracker                           |

Backend Connection

  - When the FastAPI backend is running, the app shows a green "Live Backend"
    badge and synchronizes all data from the server.
  - When the backend is offline, the app automatically falls back to a local
    sandbox mode using localStorage with rich pre-seeded mock data. All features
    remain fully functional.

3. Seed Mock Data

The seeding script populates the database with:

  - 1 Teacher: Alice Smith
  - 3 Students: Charlie Miller (10yo, Beginner), Emma Miller (8yo, Beginner),
    Frank Sinatra (30yo, Intermediate)
  - 3 Parents: Bob Miller (Charlie's), David Miller (Emma's), Frank
    (self-directed)
  - 6 Lessons across the current week (recurring series + one-off)
  - Practice logs, progress milestones, and communication drafts

Run with SQLite (no PostgreSQL needed)

cd C:\Users\Jason\.gemini\antigravity\scratch\music-teacher-app
python db/seed_data.py
# Creates: db/music_teacher.db

Dry run (prints data without writing)

python db/seed_data.py --dry-run

Run with PostgreSQL

python db/seed_data.py --db-type postgres --db-url postgresql://user:password@localhost:5432/music_teacher

4. Run the Test Suite

cd C:\Users\Jason\.gemini\antigravity\scratch\music-teacher-app\backend
python -m pytest tests/test_conflict_resolution.py -v

Expected output:

PASSED tests/test_conflict_resolution.py::test_is_overlapping
PASSED tests/test_conflict_resolution.py::test_find_conflicts_one_off
PASSED tests/test_conflict_resolution.py::test_find_conflicts_recurring
PASSED tests/test_conflict_resolution.py::test_find_conflicts_recurring_override
PASSED tests/test_conflict_resolution.py::test_recommend_slots
5 passed in 0.39s

5. Recommended Run Order

1. cd backend  →  pip install -r requirements.txt
2. python -m uvicorn app.main:app --reload --port 8000
3. Open a second terminal → python db/seed_data.py (optional)
4. Open frontend/index.html in your browser (or serve on port 3000)

Architecture & MCP Integration

See architecture_blueprint.md for:

  - System architecture diagram
  - COPPA & RLS privacy design
  - MCP tool contracts for all 4 AI agents (Scheduling, Progress, Communication,
    Recommendations)
  - UI/UX design guidelines for Teacher, Parent, and Student portals

Tech Stack

| Layer             | Tech                                                |
| ----------------- | --------------------------------------------------- |
| Frontend          | React 18 (CDN), Tailwind CSS (Play CDN), Vanilla JS |
| Backend           | FastAPI, Uvicorn, Pydantic v2                       |
| Scheduling Engine | python-dateutil (RFC 5545 RRULE)                    |
| Database          | PostgreSQL (production), SQLite (development/local) |
| Testing           | pytest                                              |
| AI Integration    | Model Context Protocol (MCP) v0.1                   |

Please update the README.md file
