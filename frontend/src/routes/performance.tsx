import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from "recharts";
import { EmptyState, PageHeader, Panel, SourceBadge } from "@/components/AppShell";
import { api, pct, titleCase, type Metrics } from "@/lib/api";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Model Performance – EcoVision AI" },
      { name: "description", content: "Training curves, confusion matrix, per-class precision/recall and CNN architecture from the real trained model." },
      { property: "og:title", content: "Model Performance – EcoVision AI" },
      { property: "og:description", content: "Real evaluation metrics of the EcoVision convolutional neural network." },
    ],
  }),
  component: Performance,
});

function Performance() {
  const metrics = useQuery({ queryKey: ["metrics"], queryFn: api.metrics, retry: false });
  const info = useQuery({ queryKey: ["model-info"], queryFn: api.modelInfo, retry: false });
  const m = metrics.data;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Evaluation" title="Model Performance" desc="All values below are read from metrics.json produced by evaluate.py on the held-out validation split. Nothing is estimated in the browser." />

      {metrics.isError && <EmptyState title="Backend not reachable">{(metrics.error as Error).message}</EmptyState>}
      {m && !m.trained && <EmptyState title="Model has not been trained">{m.message}</EmptyState>}
      {m?.trained && <TrainedMetrics m={m} />}

      <Panel title="CNN architecture" badge={<SourceBadge kind="model" />}>
        {info.data?.model_loaded && info.data.layers ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Layer</th><th>Type</th><th>Output shape</th><th className="text-right">Params</th></tr></thead>
              <tbody className="font-mono text-xs">
                {info.data.layers.map((l) => (
                  <tr key={l.name} className="border-t"><td className="py-1.5">{l.name}</td><td>{l.type}</td><td>{l.output_shape}</td><td className="text-right">{l.params.toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 text-right text-sm font-semibold">Total parameters: {info.data.total_params?.toLocaleString()}</div>
          </div>
        ) : (
          <div className="font-mono text-xs leading-6 text-muted-foreground">
            Input 128×128×3 → Augmentation → Rescaling(1/255)<br />
            → Conv2D(32,3×3)+ReLU → MaxPool → Conv2D(64)+ReLU → MaxPool<br />
            → Conv2D(128)+ReLU → MaxPool → Conv2D(128)+ReLU [last_conv] → MaxPool<br />
            → Flatten → Dense(256)+ReLU → Dropout(0.5) → Dense(6)+Softmax
            <div className="mt-2 font-sans">(Planned design — live layer details appear once the trained model is loaded.)</div>
          </div>
        )}
      </Panel>
    </div>
  );
}

function TrainedMetrics({ m }: { m: Metrics }) {
  const hist = m.history ?? {};
  const epochs = (hist.loss ?? []).map((_, i) => ({
    epoch: i + 1, acc: hist.accuracy?.[i], val_acc: hist.val_accuracy?.[i], loss: hist.loss?.[i], val_loss: hist.val_loss?.[i],
  }));
  const names = m.class_names ?? [];
  const cm = m.confusion_matrix ?? [];
  const maxCell = Math.max(1, ...cm.flat());
  const perClass = names.map((c) => ({ name: titleCase(c), precision: +(m.per_class?.[c]?.precision ?? 0).toFixed(3), recall: +(m.per_class?.[c]?.recall ?? 0).toFixed(3), f1: +(m.per_class?.[c]?.["f1-score"] ?? 0).toFixed(3) }));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-4">
        {([["Test accuracy", pct(m.test_accuracy, 2)], ["Test loss", m.test_loss?.toFixed(4) ?? "—"], ["Epochs run", String(m.epochs_run ?? "—")], ["Batch size", String(m.batch_size ?? "—")]] as [string, string][]).map(([l, v]) => (
          <Panel key={l} title={l} badge={<SourceBadge kind="model" />}><div className="font-display text-3xl font-semibold">{v}</div></Panel>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Training vs validation accuracy" badge={<SourceBadge kind="model" />}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={epochs}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="epoch" /><YAxis domain={[0, 1]} /><Tooltip /><Legend />
              <Line dataKey="acc" name="Train" stroke="var(--chart-1)" dot={false} strokeWidth={2} /><Line dataKey="val_acc" name="Validation" stroke="var(--chart-3)" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Training vs validation loss" badge={<SourceBadge kind="model" />}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={epochs}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="epoch" /><YAxis /><Tooltip /><Legend />
              <Line dataKey="loss" name="Train" stroke="var(--chart-1)" dot={false} strokeWidth={2} /><Line dataKey="val_loss" name="Validation" stroke="var(--chart-5)" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Confusion matrix (rows = actual, cols = predicted)" badge={<SourceBadge kind="model" />}>
          <div className="overflow-x-auto">
            <table className="mx-auto text-xs">
              <thead><tr><th />{names.map((n) => <th key={n} className="px-1 pb-1 font-medium">{n.slice(0, 4)}</th>)}</tr></thead>
              <tbody>
                {cm.map((row, i) => (
                  <tr key={i}><th className="pr-2 text-right font-medium">{titleCase(names[i] ?? "")}</th>
                    {row.map((v, j) => (
                      <td key={j} className="h-10 w-12 text-center font-mono" style={{ background: `color-mix(in oklch, var(--primary) ${(v / maxCell) * 100}%, var(--muted))`, color: v / maxCell > 0.5 ? "var(--primary-foreground)" : "var(--foreground)" }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Category-wise performance" badge={<SourceBadge kind="model" />}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={perClass}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis domain={[0, 1]} /><Tooltip /><Legend />
              <Bar dataKey="precision" fill="var(--chart-1)" radius={[4, 4, 0, 0]} /><Bar dataKey="recall" fill="var(--chart-2)" radius={[4, 4, 0, 0]} /><Bar dataKey="f1" name="F1" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </>
  );
}
