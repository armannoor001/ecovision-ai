import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/AppShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About the Project – EcoVision AI" },
      { name: "description", content: "Problem statement, methodology, CNN architecture, dataset and setup steps of the EcoVision AI deep learning project." },
      { property: "og:title", content: "About EcoVision AI" },
      { property: "og:description", content: "Methodology and architecture of a CNN-based waste classification system." },
    ],
  }),
  component: About,
});

const STEPS = [
  ["Dataset", "TrashNet images (cardboard, glass, metal, paper, plastic) + an organic class, arranged one folder per class."],
  ["Preprocessing", "Resize to 128×128, 80/20 train/validation split, pixel normalization to [0,1]."],
  ["Augmentation", "Random flips, rotations, zoom and contrast to reduce overfitting."],
  ["Training", "Adam optimizer, categorical cross-entropy, configurable epochs/batch size, best checkpoint saved as .keras."],
  ["Evaluation", "Accuracy, loss, confusion matrix and per-class precision/recall/F1 via scikit-learn."],
  ["Deployment", "FastAPI loads the model, validates uploads, predicts and computes Grad-CAM heatmaps."],
];

function About() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Documentation" title="About the Project" desc="EcoVision AI – Intelligent Waste Classification System Using Convolutional Neural Networks." />
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Problem statement">
          <p className="text-sm text-muted-foreground">Incorrect waste segregation contaminates recycling streams and sends recoverable material to landfill. Manual sorting is slow and error-prone. A CNN can recognise material types from images and guide correct disposal.</p>
        </Panel>
        <Panel title="Objectives">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Build and train a CNN from scratch for 6-class waste classification.</li>
            <li>Serve real predictions through a REST API.</li>
            <li>Explain decisions with Grad-CAM.</li>
            <li>Report honest evaluation metrics.</li>
          </ul>
        </Panel>
      </div>
      <Panel title="Methodology">
        <ol className="grid gap-3 md:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="rounded-xl border p-4">
              <div className="font-mono text-xs text-primary">0{i + 1}</div>
              <div className="font-semibold">{t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </Panel>
      <Panel title="Run it locally">
        <pre className="overflow-x-auto rounded-xl bg-sidebar p-4 font-mono text-xs leading-6 text-sidebar-foreground">{`# 1. Train (after placing images in dataset/waste/<class>/)
cd deep-learning && pip install -r ../backend/requirements.txt
python train.py --epochs 30 --batch-size 32
python evaluate.py

# 2. Backend
cd ../backend && uvicorn main:app --reload --port 8000

# 3. Frontend
cd ../frontend && npm install && npm run dev`}</pre>
      </Panel>
    </div>
  );
}
