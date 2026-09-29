from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine, Base, test_db_connection
import app.models  # Ensures all SQLAlchemy models are registered on Base.metadata
from app.api.routes.auth import router as auth_router
from app.api.routes.forms import router as forms_router
from app.api.routes.public import router as public_router
from app.api.routes.files import router as files_router
from app.api.routes.responses import router as responses_router
from app.api.routes.dashboard import router as dashboard_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure uploads directory exists
    os.makedirs(os.path.abspath("uploads"), exist_ok=True)
    # Base.metadata.create_all() is idempotent — it creates tables if they don't exist
    Base.metadata.create_all(bind=engine)

    # Idempotent schema migration for submissions session tracking and form retention
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()"))
            conn.execute(text("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed'"))
            conn.execute(text("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS response_data JSONB DEFAULT '{}'::jsonb"))
            conn.execute(text("ALTER TABLE submissions ALTER COLUMN submitted_at DROP NOT NULL"))
            conn.execute(text("UPDATE submissions SET status = 'completed' WHERE status IS NULL"))
            conn.execute(text("UPDATE submissions SET started_at = submitted_at WHERE started_at IS NULL"))
            conn.execute(text("ALTER TABLE forms ADD COLUMN IF NOT EXISTS retention_days INTEGER"))
            conn.execute(text("ALTER TABLE forms ADD COLUMN IF NOT EXISTS max_submissions INTEGER"))
            conn.execute(text("ALTER TABLE forms ADD COLUMN IF NOT EXISTS closes_at TIMESTAMP WITH TIME ZONE"))
            conn.execute(text("ALTER TABLE forms ADD COLUMN IF NOT EXISTS closed_message VARCHAR(500) DEFAULT 'This form is no longer accepting new submissions.'"))
    except Exception as e:
        print(f"Schema migration notice: {e}")

    yield



app = FastAPI(
    title="Dynamic Workflow Automation System",
    description="Smart form and workflow automation backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware setup allowing static frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["*"],
)

# Register Authentication, Form Management, Public, File, and Response Routes
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(forms_router, prefix="", tags=["forms"])
app.include_router(responses_router, prefix="", tags=["responses"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
app.include_router(public_router, prefix="", tags=["public"])
app.include_router(files_router, prefix="", tags=["files"])

# Mount static frontend directory
if os.path.exists("frontend"):
    app.mount("/app", StaticFiles(directory="frontend", html=True), name="frontend")


@app.get("/", include_in_schema=False)
def root_redirect():
    return RedirectResponse(url="/app/public/index.html")


@app.get("/health")
def health_check():
    db_connected = test_db_connection()

    return {
        "application": "running",
        "database": "connected" if db_connected else "disconnected"
    }