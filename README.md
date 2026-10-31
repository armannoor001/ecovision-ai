# EcoVision AI – Intelligent Waste Classification System Using Convolutional Neural Networks

An academic Deep Learning project: a CNN built and trained from scratch in TensorFlow/Keras classifies waste images into **plastic, paper, cardboard, glass, metal and organic**, served via FastAPI and visualised in a React + TypeScript dashboard with Grad-CAM explainability.

> **Status:** the repository ships *code only*. No model weights or metrics are included. Until you train the model locally, the API returns `503` for `/predict` and the dashboard shows “Model not trained”.

## 1. Problem statement
Poor segregation contaminates recycling streams. Manual sorting is slow and inconsistent. Computer vision can recognise material type from a photo and recommend the correct disposal route.

## 2. Objectives
- Design and train a CNN for 6-class waste image classification.
- Evaluate it honestly (accuracy, loss, confusion matrix, per-class precision/recall/F1).
- Expose real inference via a REST API.
- Explain predictions with Grad-CAM.
- Provide a clean dashboard for demonstration.

## 3. Methodology
1. **Data** – images arranged in `dataset/waste/<class>/`.
2. **Preprocessing** – resize to 128×128, 80/20 train/validation split (seed 42), normalisation (`Rescaling(1/255)` inside the model so inference uses identical preprocessing).
3. **Augmentation** – RandomFlip, RandomRotation(0.1), RandomZoom(0.1), RandomContrast(0.1) (active only during training).
4. **Training** – Adam (lr 1e-3), categorical cross-entropy, configurable epochs/batch size, `ModelCheckpoint` (best `val_accuracy`), EarlyStopping, ReduceLROnPlateau.
5. **Evaluation** – `evaluate.py` writes `backend/model/metrics.json`.
6. **Deployment** – FastAPI loads `ecovision_cnn.keras` and returns probabilities + Grad-CAM.

## 4. Neural network architecture
```
Input (128×128×3)
→ Data augmentation → Rescaling(1/255)
→ Conv2D(32, 3×3, ReLU)  → MaxPool(2×2)
→ Conv2D(64, 3×3, ReLU)  → MaxPool(2×2)
→ Conv2D(128, 3×3, ReLU) → MaxPool(2×2)
→ Conv2D(128, 3×3, ReLU) [last_conv – used by Grad-CAM] → MaxPool(2×2)
→ Flatten → Dense(256, ReLU) → Dropout(0.5) → Dense(6, Softmax)
```
See `deep-learning/model_architecture.py` (`python model_architecture.py` prints the summary).

## 5. Dataset
See [`dataset/README.md`](dataset/README.md). TrashNet (https://github.com/garythung/trashnet) supplies 5 classes; the organic class comes from the `biological` folder of Kaggle “Garbage Classification (12 classes)”.

## 6. Repository structure
```
ecovision-ai/
├── frontend/          React + TypeScript + Tailwind + Recharts dashboard
├── backend/           FastAPI server (main.py, routes/, services/, model/)
├── deep-learning/     preprocessing, architecture, train, evaluate, gradcam
├── notebooks/         EcoVision_CNN_Training.ipynb
├── dataset/           (images not committed)
└── README.md
```

## 7. Installation
Requirements: Python 3.10–3.11, Node 18+.
```bash
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
```

## 8. Train the model  ⚠ required before predictions work
```bash
cd deep-learning
python train.py --epochs 30 --batch-size 32       # saves backend/model/ecovision_cnn.keras + training_history.json
python evaluate.py                                # saves backend/model/metrics.json
```
A GPU is recommended; on CPU expect ~1–3 min per epoch for ~2,500 images.

## 9. Run the backend
```bash
cd backend
cp .env.example .env
uvicorn main:app --reload --port 8000             # docs at http://localhost:8000/docs
```

## 10. Run the frontend
```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:8000
npm install
npm run dev
```
The backend address can also be changed from the sidebar of the app.

## 11. API documentation
| Method | Endpoint | Response |
|---|---|---|
| GET | `/health` | `{status, model_loaded, error}` |
| POST | `/predict` (multipart `file`) | `{predicted_class, confidence, probabilities{6}, recommendation, gradcam_image, explanation, ...}` |
| GET | `/model-info` | layers, output shapes, parameter counts |
| GET | `/history?limit=100` | `{total, distribution, items[]}` |
| GET | `/metrics` | contents of `metrics.json`, or `{trained:false}` |

Errors: `400` invalid/empty image, `413` >10 MB, `415` wrong type, `503` model not trained, `500` inference failure.

## 12. Evaluation metrics
Reported after `evaluate.py`: test accuracy, test loss, train/val accuracy & loss curves, confusion matrix, per-class precision/recall/F1. The dashboard labels these **Model evaluation** and keeps them separate from **Uploaded images** statistics. *Fill in your own results here after training — do not copy numbers from elsewhere.*

| Metric | Value |
|---|---|
| Test accuracy | _after training_ |
| Test loss | _after training_ |

## 13. Screenshots
Add screenshots to `docs/screenshots/` after running: Overview, Classification + Grad-CAM, Analytics, Model Performance.

## 14. Future scope
Transfer learning (MobileNetV2/EfficientNet), more classes (e-waste, hazardous), object detection for multiple items, mobile/edge deployment with TFLite, smart-bin hardware integration.

## 15. Components that require local training
- `/predict`, Grad-CAM, `/model-info` layer table → need `backend/model/ecovision_cnn.keras`
- Model Performance page and accuracy cards → need `backend/model/metrics.json`
