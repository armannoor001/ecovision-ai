from fastapi import APIRouter, Query

from services.model_service import model_service

router = APIRouter()


@router.get("/model-info")
def model_info():
    return model_service.info()


@router.get("/metrics")
def metrics():
    return model_service.metrics()


@router.get("/history")
def history(limit: int = Query(100, ge=1, le=1000)):
    return model_service.history(limit)
