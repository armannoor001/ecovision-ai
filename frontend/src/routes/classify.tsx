import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, ImageUp, Loader2, Recycle, Wand2, X } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { EmptyState, PageHeader, Panel, useHealth } from "@/components/AppShell";
import { api, CLASS_COLORS, pct, titleCase, type Prediction } from "@/lib/api";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/classify")({
  head: () => ({
    meta: [
      { title: "Classify Waste Image – EcoVision AI" },
      { name: "description", content: "Upload a JPG or PNG and get a CNN prediction, confidence breakdown, Grad-CAM heatmap and disposal advice." },
      { property: "og:title", content: "Classify Waste Image – EcoVision AI" },
      { property: "og:description", content: "Real-time CNN waste classification with explainable heatmaps." },
    ],
  }),
  component: Classify,
});

const ACCEPT = ["image/jpeg", "image/png"];

function Classify() {
  const qc = useQueryClient();
  const health = useHealth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (f: File) => api.predict(f),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["history"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (f?: File) => {
    if (!f) return;
    if (!ACCEPT.includes(f.type)) { toast.error("Please choose a JPG, JPEG or PNG image."); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error("Image must be under 10 MB."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    mutation.reset();
  };

  const clear = () => { setFile(null); setPreview(null); mutation.reset(); };
  const notReady = health.isError || (health.data && !health.data.model_loaded);

  return (
    <div>
      <PageHeader eyebrow="Inference" title="Image Classification" desc="Upload a photo of a single waste item. The image is sent to the FastAPI backend, where the trained CNN predicts its category." />

      {notReady && (
        <div className="mb-6 flex gap-3 rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>{health.isError ? "Backend is offline — predictions are unavailable until it is running." : "The backend is running but no trained model was found. Train the CNN locally first."}</div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="1. Upload image">
          {!preview ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
              className={`flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors ${drag ? "border-primary bg-secondary" : "border-border bg-muted hover:border-primary"}`}
            >
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground"><ImageUp className="h-6 w-6" /></div>
              <div className="font-semibold">Drop an image or click to browse</div>
              <div className="text-xs text-muted-foreground">JPG, JPEG, PNG · up to 10 MB</div>
            </button>
          ) : (
            <div className="relative overflow-hidden rounded-xl border bg-muted">
              <img src={preview} alt="Uploaded waste item" className="aspect-[4/3] w-full object-contain" />
              {mutation.isPending && <div className="pointer-events-none absolute inset-x-0 h-1 bg-accent shadow-[0_0_20px_var(--accent)] animate-scan" />}
              <button onClick={clear} aria-label="Remove image" className="absolute right-2 top-2 rounded-full bg-card p-1.5 shadow-card"><X className="h-4 w-4" /></button>
            </div>
          )}
          <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          <Button className="mt-4 w-full" size="lg" disabled={!file || mutation.isPending} onClick={() => file && mutation.mutate(file)}>
            {mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Running CNN…</> : <><Wand2 className="h-4 w-4" /> Predict</>}
          </Button>
          {file && <div className="mt-2 truncate text-center text-xs text-muted-foreground">{file.name}</div>}
        </Panel>

        <Panel title="2. Prediction">
          {mutation.isError && <EmptyState title="Prediction failed">{(mutation.error as Error).message}</EmptyState>}
          {!mutation.data && !mutation.isError && (
            <EmptyState title={mutation.isPending ? "Analyzing…" : "No prediction yet"}>Results from the neural network will appear here.</EmptyState>
          )}
          {mutation.data && <Result p={mutation.data} />}
        </Panel>
      </div>

      {mutation.data && <Explain p={mutation.data} preview={preview} />}
    </div>
  );
}

function Result({ p }: { p: Prediction }) {
  const data = Object.entries(p.probabilities).map(([k, v]) => ({ name: titleCase(k), key: k, value: +(v * 100).toFixed(2) })).sort((a, b) => b.value - a.value);
  return (
    <div className="space-y-5 animate-fade-up">
      <div className="rounded-xl bg-hero p-5 text-primary-foreground">
        <div className="text-xs uppercase tracking-widest opacity-75">Predicted category</div>
        <div className="mt-1 font-display text-4xl font-semibold">{titleCase(p.predicted_class)}</div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary-foreground/20">
          <div className="h-full rounded-full bg-accent" style={{ width: `${p.confidence * 100}%` }} />
        </div>
        <div className="mt-1 text-sm">Confidence: <strong>{pct(p.confidence, 2)}</strong></div>
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold">Confidence breakdown (softmax output)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {data.map((d) => <Cell key={d.key} fill={CLASS_COLORS[d.key]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-3 rounded-xl border bg-secondary p-4">
        <Recycle className="h-5 w-5 shrink-0 text-primary" />
        <div><div className="text-sm font-semibold">How to dispose</div><p className="text-sm text-secondary-foreground">{p.recommendation}</p></div>
      </div>
    </div>
  );
}

function Explain({ p, preview }: { p: Prediction; preview: string | null }) {
  return (
    <Panel title="3. Why did the model decide this? (Grad-CAM)" className="mt-6">
      {p.gradcam_image ? (
        <div className="grid gap-6 md:grid-cols-[1fr_1fr_1.2fr]">
          {preview && <figure><img src={preview} alt="Original" className="aspect-square w-full rounded-xl object-cover" /><figcaption className="mt-1 text-center text-xs text-muted-foreground">Original</figcaption></figure>}
          <figure><img src={p.gradcam_image} alt="Grad-CAM heatmap" className="aspect-square w-full rounded-xl object-cover" /><figcaption className="mt-1 text-center text-xs text-muted-foreground">Grad-CAM heatmap</figcaption></figure>
          <div className="text-sm">
            <p>{p.explanation}</p>
            <p className="mt-3 text-muted-foreground">
              <strong className="text-foreground">In simple words:</strong> Grad-CAM looks at the last convolutional layer and measures how much each
              feature map pushed the score for “{p.predicted_class}” up. Those maps are combined into a heatmap and laid over your photo.
            </p>
          </div>
        </div>
      ) : (
        <EmptyState title="Heatmap unavailable">{p.explanation}</EmptyState>
      )}
    </Panel>
  );
}
