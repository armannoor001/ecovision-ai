import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { EmptyState, PageHeader, Panel, SourceBadge } from "@/components/AppShell";
import { api, CLASS_COLORS, pct, titleCase } from "@/lib/api";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics Dashboard – EcoVision AI" },
      { name: "description", content: "Statistics on images classified through EcoVision AI: totals, category distribution and prediction history." },
      { property: "og:title", content: "Analytics Dashboard – EcoVision AI" },
      { property: "og:description", content: "Usage analytics of the CNN waste classifier." },
    ],
  }),
  component: Analytics,
});

function Analytics() {
  const history = useQuery({ queryKey: ["history"], queryFn: api.history, retry: false });
  const metrics = useQuery({ queryKey: ["metrics"], queryFn: api.metrics, retry: false });

  if (history.isError) {
    return (<div><PageHeader eyebrow="Analytics" title="Analytics Dashboard" /><EmptyState title="Backend not reachable">{(history.error as Error).message}</EmptyState></div>);
  }
  const h = history.data;
  const dist = h ? Object.entries(h.distribution).map(([k, v]) => ({ key: k, name: titleCase(k), value: v })) : [];
  const avgConf = h && h.items.length ? h.items.reduce((s, i) => s + i.confidence, 0) / h.items.length : undefined;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Analytics" title="Analytics Dashboard" desc="Green badges are real model evaluation results; grey badges are statistics from images uploaded to this system." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel title="Total images analyzed" badge={<SourceBadge kind="usage" />}><div className="font-display text-4xl font-semibold">{h?.total ?? "—"}</div></Panel>
        <Panel title="Avg. prediction confidence" badge={<SourceBadge kind="usage" />}><div className="font-display text-4xl font-semibold">{pct(avgConf)}</div></Panel>
        <Panel title="Model test accuracy" badge={<SourceBadge kind="model" />}>
          <div className="font-display text-4xl font-semibold">{metrics.data?.trained ? pct(metrics.data.test_accuracy) : "—"}</div>
          {metrics.data && !metrics.data.trained && <div className="text-xs text-muted-foreground">Model not evaluated yet</div>}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Category distribution" badge={<SourceBadge kind="usage" />}>
          {h && h.total > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={dist.filter((d) => d.value > 0)} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {dist.filter((d) => d.value > 0).map((d) => <Cell key={d.key} fill={CLASS_COLORS[d.key]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No predictions yet">Classify some images to see the distribution.</EmptyState>}
        </Panel>
        <Panel title="Predictions per category" badge={<SourceBadge kind="usage" />}>
          {h && h.total > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dist}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>{dist.map((d) => <Cell key={d.key} fill={CLASS_COLORS[d.key]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No predictions yet" />}
        </Panel>
      </div>

      <Panel title="Prediction history" badge={<SourceBadge kind="usage" />}>
        {h && h.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Time</th><th>File</th><th>Prediction</th><th className="text-right">Confidence</th></tr></thead>
              <tbody>
                {h.items.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="py-2 whitespace-nowrap">{new Date(i.timestamp).toLocaleString()}</td>
                    <td className="max-w-[200px] truncate">{i.filename}</td>
                    <td><span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: CLASS_COLORS[i.predicted_class] }} />{titleCase(i.predicted_class)}</span></td>
                    <td className="text-right font-mono">{pct(i.confidence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title={history.isLoading ? "Loading…" : "History is empty"} />}
      </Panel>
    </div>
  );
}
