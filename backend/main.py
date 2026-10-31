"""EcoVision AI – FastAPI backend serving the trained CNN.

Run:  uvicorn main:app --reload --port 8000
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routes import health, predict, info  # noqa: E402
from services.model_service import model_service  # noqa: E402

app = FastAPI(title="EcoVision AI API", version="1.0.0")

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])

app.include_router(health.router)
app.include_router(predict.router)
app.include_router(info.router)


@app.on_event("startup")
def startup():
    model_service.load()
