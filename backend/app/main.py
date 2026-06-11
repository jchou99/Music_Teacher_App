# app/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# NEW: Automatically find and load .env relative to this file's location
from dotenv import load_dotenv
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_path = os.path.join(base_dir, ".env")
load_dotenv(dotenv_path)

# Your existing router and database imports below:
from app.database import Base, engine
from app.routers import students, lessons, notes, reminders, events, contacts, ai_settings, ai_chat

app = FastAPI(title="Music Teacher API")

# -------------------------
# CORS
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# DATABASE STARTUP
# -------------------------
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

# -------------------------
# ROUTER INTEGRATION
# -------------------------
app.include_router(students.router)
app.include_router(lessons.router)
app.include_router(notes.router)
app.include_router(reminders.router)
app.include_router(events.router)
app.include_router(contacts.router)
app.include_router(ai_settings.router)
app.include_router(ai_chat.router)