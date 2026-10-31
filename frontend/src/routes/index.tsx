import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Brain, Layers, ScanSearch, Sparkles } from "lucide-react";
import { Panel, useHealth } from "@/components/AppShell";
import { api, CLASSES, CLASS_COLORS, pct, titleCase } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EcoVision AI – Intelligent Waste Classification with CNNs" },
      { name: "description", content: "Upload a photo of waste and a trained convolutional neural network classifies it into six categories with disposal advice." },
      { property: "og:title", content: "EcoVision AI – Intelligent Waste Classification" },
      { property: "og:description", content: "A CNN-powered waste classifier with Grad-CAM explainability and real evaluation metrics." },
    ],
  }),
  component: Overview,
});

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Panel>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
    </Panel>
  );
}

function Overview() {
  const health = useHealth();
  const metrics = useQuery({ queryKey: ["metrics"], queryFn: api.metrics, retry: false });
  const history = useQuery({ queryKey: ["history"], queryFn: api.history, retry: false });
  const info = useQuery({ queryKey: ["model-info"], queryFn: api.modelInfo, retry: false });

  const offline = health.isError;
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-hero p-8 text-primary-foreground md:p-12 animate-fade-up">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> Deep Learning · Computer Vision
          </div>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
            Sorting waste, one convolution at a time.
          </h1>
          <p className="mt-4 text-primary-foreground/80">
            EcoVision AI uses a convolutional neural network trained on real waste images to identify
            plastic, paper, cardboard, glass, metal and organic waste — and tells you how to dispose of it.
          </p>
          <Link to="/classify" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-accent-foreground transition-transform hover:-translate-y-0.5">
            Classify an image <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {offline && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <strong>Backend not reachable.</strong> Start the FastAPI server (<code className="font-mono">uvicorn main:app --port 8000</code>) and set its address in the sidebar. No numbers are shown until real data is available.
        </div>
      )}
      {!offline && health.data && !health.data.model_loaded && (
        <div className="rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm">
          <strong>Model not trained yet.</strong> Run <code className="font-mono">deep-learning/train.py</code> and <code className="font-mono">evaluate.py</code> locally, then restart the backend.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Test accuracy" value={metrics.data?.trained ? pct(metrics.data.test_accuracy) : "—"} note="From evaluate.py" />
        <Stat label="Images analyzed" value={history.data ? String(history.data.total) : "—"} note="Via /predict" />
        <Stat label="Parameters" value={info.data?.total_params ? info.data.total_params.toLocaleString() : "—"} note="Trainable CNN weights" />
        <Stat label="Classes" value="6" note="Waste categories" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: ScanSearch, t: "Upload & predict", d: "Images are resized to 128×128 and passed through the trained CNN on the Python backend." },
          { icon: Layers, t: "Real CNN", d: "4 convolution + ReLU + max-pool blocks, dense layer with dropout and a 6-way softmax." },
          { icon: Brain, t: "Explainable", d: "Grad-CAM heatmaps show which pixels influenced each decision." },
        ].map(({ icon: Icon, t, d }) => (
          <Panel key={t}>
            <Icon className="h-6 w-6 text-primary" />
            <div className="mt-3 font-semibold">{t}</div>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </Panel>
        ))}
      </div>

      <Panel title="Waste categories">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CLASSES.map((c) => (
            <div key={c} className="rounded-xl border p-3">
              <div className="h-2 w-8 rounded-full" style={{ background: CLASS_COLORS[c] }} />
              <div className="mt-2 text-sm font-semibold">{titleCase(c)}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
