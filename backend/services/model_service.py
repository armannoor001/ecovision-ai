"""Loads the .keras model once and runs real inference + Grad-CAM."""
import io
import json
import os
import sys
import threading
import uuid
from datetime import datetime, timezone

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
sys.path.append(os.path.join(BACKEND, "..", "deep-learning"))

MODEL_PATH = os.getenv("MODEL_PATH", os.path.join(BACKEND, "model", "ecovision_cnn.keras"))
METRICS_PATH = os.path.join(BACKEND, "model", "metrics.json")
HISTORY_PATH = os.getenv("HISTORY_PATH", os.path.join(BACKEND, "model", "prediction_history.json"))
CLASS_NAMES = ["cardboard", "glass", "metal", "organic", "paper", "plastic"]
IMG_SIZE = (128, 128)

RECOMMENDATIONS = {
    "plastic": "Rinse and place in the dry recycling bin. Check the resin code (1–7); avoid putting plastic bags in curbside recycling.",
    "paper": "Keep it dry and clean, then recycle with paper. Greasy or wet paper should go to compost.",
    "cardboard": "Flatten boxes, remove tape and recycle. Pizza boxes with grease belong in compost.",
    "glass": "Rinse and recycle in the glass bin. Do not include ceramics, mirrors or light bulbs.",
    "metal": "Rinse cans and recycle with metals. Aerosol cans must be empty; batteries go to e-waste collection.",
    "organic": "Compost it (wet/green bin). Food scraps and garden waste turn into nutrient-rich soil.",
}


class ModelService:
    def __init__(self):
        self.model = None
        self.error = None
        self.lock = threading.Lock()

    def load(self):
        if not os.path.exists(MODEL_PATH):
            self.error = f"Model file not found at {MODEL_PATH}. Train it with deep-learning/train.py."
            return
        try:
            import tensorflow as tf
            self.model = tf.keras.models.load_model(MODEL_PATH)
            self.error = None
        except Exception as e:  # noqa: BLE001
            self.error = f"Failed to load model: {e}"

    @property
    def loaded(self):
        return self.model is not None

    def info(self):
        if not self.loaded:
            return {"model_loaded": False, "error": self.error, "classes": CLASS_NAMES}
        layers = []
        for l in self.model.layers:
            try:
                shape = str(l.output.shape)
            except Exception:  # noqa: BLE001
                shape = "-"
            layers.append({"name": l.name, "type": l.__class__.__name__, "output_shape": shape, "params": int(l.count_params())})
        return {
            "model_loaded": True,
            "name": self.model.name,
            "input_shape": [*IMG_SIZE, 3],
            "classes": CLASS_NAMES,
            "total_params": int(self.model.count_params()),
            "layers": layers,
        }

    def metrics(self):
        if not os.path.exists(METRICS_PATH):
            return {"trained": False, "message": "No evaluation metrics yet. Run train.py then evaluate.py."}
        with open(METRICS_PATH) as f:
            return json.load(f)

    def predict(self, raw: bytes, filename: str):
        from gradcam import make_gradcam_heatmap, overlay_heatmap, describe_focus

        img = Image.open(io.BytesIO(raw)).convert("RGB")
        resized = img.resize(IMG_SIZE)
        batch = np.expand_dims(np.asarray(resized, dtype=np.float32), 0)  # model rescales internally
        probs = self.model.predict(batch, verbose=0)[0]
        idx = int(np.argmax(probs))
        label = CLASS_NAMES[idx]

        gradcam_url, explanation = None, None
        try:
            heat = make_gradcam_heatmap(self.model, batch, idx)
            preview = img.copy()
            preview.thumbnail((384, 384))
            gradcam_url = overlay_heatmap(preview, heat)
            explanation = describe_focus(heat)
        except Exception as e:  # noqa: BLE001
            explanation = f"Grad-CAM unavailable: {e}"

        result = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "filename": filename,
            "predicted_class": label,
            "confidence": float(probs[idx]),
            "probabilities": {c: float(p) for c, p in zip(CLASS_NAMES, probs)},
            "recommendation": RECOMMENDATIONS[label],
            "gradcam_image": gradcam_url,
            "explanation": explanation,
        }
        self._append_history({k: result[k] for k in ("id", "timestamp", "filename", "predicted_class", "confidence")})
        return result

    def _read_history(self):
        if not os.path.exists(HISTORY_PATH):
            return []
        with open(HISTORY_PATH) as f:
            return json.load(f)

    def _append_history(self, item):
        with self.lock:
            items = self._read_history()
            items.insert(0, item)
            with open(HISTORY_PATH, "w") as f:
                json.dump(items[:1000], f, indent=2)

    def history(self, limit: int = 100):
        items = self._read_history()
        dist = {c: 0 for c in CLASS_NAMES}
        for it in items:
            dist[it["predicted_class"]] = dist.get(it["predicted_class"], 0) + 1
        return {"total": len(items), "distribution": dist, "items": items[:limit]}


model_service = ModelService()
