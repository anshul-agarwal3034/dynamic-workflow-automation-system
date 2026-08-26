from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.database import engine, Base, test_db_connection
import app.models  # Ensures all SQLAlchemy models are registered on Base.metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Base.metadata.create_all() is idempotent — it only creates tables that don't already exist,
    # so it will NOT affect or duplicate the tables that already exist in the database from when Alembic created them.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Dynamic Workflow Automation System",
    description="Smart form and workflow automation backend",
    version="1.0.0",
    lifespan=lifespan
)

from fastapi.staticfiles import StaticFiles
import os

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