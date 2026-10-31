# EcoVision AI – Backend (FastAPI)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```
Open http://localhost:8000/docs for interactive API docs.

> `/predict` returns **503** until `model/ecovision_cnn.keras` exists. Train it first (see root README).

| Method | Path | Description |
|---|---|---|
| GET | /health | Server status and whether the model is loaded |
| POST | /predict | multipart `file` (JPG/PNG ≤10 MB) → class, confidence, all probabilities, recommendation, Grad-CAM |
| GET | /model-info | Layers, output shapes, parameter counts |
| GET | /history?limit=100 | Prediction log + class distribution |
| GET | /metrics | Real evaluation metrics from `evaluate.py` (or `trained:false`) |
