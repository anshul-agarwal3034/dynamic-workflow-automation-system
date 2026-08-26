from fastapi import FastAPI

from app.database import test_db_connection

app = FastAPI(
    title="Dynamic Workflow Automation System",
    description="Smart form and workflow automation backend",
    version="1.0.0"
)


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