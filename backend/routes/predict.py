import io

from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from services.model_service import model_service

router = APIRouter()
ALLOWED = {"image/jpeg", "image/jpg", "image/png"}
MAX_BYTES = 10 * 1024 * 1024


@router.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not model_service.loaded:
        raise HTTPException(503, detail=model_service.error or "Model not loaded. Train the model first.")
    if file.content_type not in ALLOWED:
        raise HTTPException(415, detail="Only JPG, JPEG and PNG images are supported.")
    raw = await file.read()
    if not raw:
        raise HTTPException(400, detail="Uploaded file is empty.")
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, detail="Image is larger than 10 MB.")
    try:
        Image.open(io.BytesIO(raw)).verify()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(400, detail="File is not a valid image.")
    try:
        return model_service.predict(raw, file.filename or "upload")
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, detail=f"Prediction failed: {e}")
