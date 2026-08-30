from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import engine, Base, test_db_connection
import app.models  # Ensures all SQLAlchemy models are registered on Base.metadata
from app.api.routes.auth import router as auth_router
from app.api.routes.forms import router as forms_router
from app.api.routes.public import router as public_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Base.metadata.create_all() is idempotent — it creates tables if they don't exist
    Base.metadata.create_all(bind=engine)
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

# Register Authentication, Form Management, and Public Routes
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(forms_router, prefix="", tags=["forms"])
app.include_router(public_router, prefix="", tags=["public"])

# Mount static pages directory
if os.path.exists("pages"):
    app.mount("/pages", StaticFiles(directory="pages", html=True), name="pages")


@app.get("/")
def root():
    return {
        "message": "Dynamic Workflow Automation System API is running"
    }


@app.get("/health")
def health_check():
    db_connected = test_db_connection()

    return {
        "application": "running",
        "database": "connected" if db_connected else "disconnected"
    }