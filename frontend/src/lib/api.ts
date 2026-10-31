// Client for the EcoVision FastAPI backend. No predictions or metrics are generated here.
export const CLASSES = ["cardboard", "glass", "metal", "organic", "paper", "plastic"] as const;
export type WasteClass = (typeof CLASSES)[number];

export const CLASS_COLORS: Record<string, string> = {
  cardboard: "var(--chart-5)",
  glass: "var(--chart-4)",
  metal: "var(--chart-6)",
  organic: "var(--chart-3)",
  paper: "var(--chart-2)",
  plastic: "var(--chart-1)",
};

const STORAGE_KEY = "ecovision.apiUrl";
export const DEFAULT_API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

export function getApiUrl(): string {
  if (typeof window === "undefined") return DEFAULT_API_URL;
  return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_API_URL;
}
export function setApiUrl(url: string) {
  window.localStorage.setItem(STORAGE_KEY, url.replace(/\/+$/, ""));
}

export interface Health { status: string; model_loaded: boolean; error?: string | null }
export interface LayerInfo { name: string; type: string; output_shape: string; params: number }
export interface ModelInfo {
  model_loaded: boolean; error?: string; name?: string; input_shape?: number[];
  classes: string[]; total_params?: number; layers?: LayerInfo[];
}
export interface ClassScore { precision: number; recall: number; "f1-score": number; support: number }
export interface Metrics {
  trained: boolean; message?: string; test_accuracy?: number; test_loss?: number;
  class_names?: string[]; confusion_matrix?: number[][]; per_class?: Record<string, ClassScore>;
  history?: { accuracy?: number[]; val_accuracy?: number[]; loss?: number[]; val_loss?: number[] };
  epochs_run?: number; batch_size?: number; trained_at?: string;
}
export interface HistoryItem { id: string; timestamp: string; filename: string; predicted_class: string; confidence: number }
export interface History { total: number; distribution: Record<string, number>; items: HistoryItem[] }
export interface Prediction extends HistoryItem {
  probabilities: Record<string, number>; recommendation: string;
  gradcam_image: string | null; explanation: string | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}${path}`, init);
  } catch {
    throw new Error(`Cannot reach the backend at ${getApiUrl()}. Is the FastAPI server running?`);
  }
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try { const body = await res.json(); if (body?.detail) detail = String(body.detail); } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<Health>("/health"),
  modelInfo: () => request<ModelInfo>("/model-info"),
  metrics: () => request<Metrics>("/metrics"),
  history: () => request<History>("/history?limit=200"),
  predict: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<Prediction>("/predict", { method: "POST", body: fd });
  },
};

export const pct = (v?: number, d = 1) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);
export const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
