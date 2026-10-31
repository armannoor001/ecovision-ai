import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, BookOpen, Cpu, Home, Leaf, Menu, ScanSearch, X } from "lucide-react";
import { api, getApiUrl, setApiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Overview", icon: Home },
  { to: "/classify", label: "Classify Image", icon: ScanSearch },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/performance", label: "Model Performance", icon: Cpu },
  { to: "/about", label: "About the Project", icon: BookOpen },
] as const;

export function useHealth() {
  return useQuery({ queryKey: ["health"], queryFn: api.health, retry: false, refetchInterval: 15000 });
}

function BackendStatus() {
  const qc = useQueryClient();
  const { data, isError, isLoading } = useHealth();
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(getApiUrl()), []);

  const state = isLoading ? "checking" : isError ? "offline" : data?.model_loaded ? "ready" : "untrained";
  const label = { checking: "Checking…", offline: "Backend offline", ready: "Model loaded", untrained: "Model not trained" }[state];
  const dot = { checking: "bg-muted-foreground", offline: "bg-destructive", ready: "bg-sidebar-primary", untrained: "bg-warning" }[state];

  return (
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent p-3 text-xs">
      <div className="flex items-center gap-2 font-semibold text-sidebar-accent-foreground">
        <span className={cn("h-2 w-2 rounded-full", dot)} /> {label}
      </div>
      <form
        className="mt-2 flex gap-1"
        onSubmit={(e) => { e.preventDefault(); setApiUrl(url); qc.invalidateQueries(); }}
      >
        <input
          aria-label="Backend URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-sidebar-border bg-sidebar px-2 py-1 font-mono text-[11px] text-sidebar-foreground outline-none focus:border-sidebar-ring"
        />
        <button className="rounded-md bg-sidebar-primary px-2 font-semibold text-sidebar-primary-foreground">Set</button>
      </form>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col gap-6 bg-sidebar p-5 text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-lg font-semibold leading-none text-sidebar-accent-foreground">EcoVision AI</div>
            <div className="text-[11px] opacity-70">CNN Waste Classifier</div>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent",
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto"><BackendStatus /></div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <span className="font-display font-semibold">EcoVision AI</span>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <div className="mb-8 animate-fade-up">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</div>
      <h1 className="mt-1 text-3xl font-semibold md:text-4xl">{title}</h1>
      {desc && <p className="mt-2 max-w-2xl text-muted-foreground">{desc}</p>}
    </div>
  );
}

export function Panel({ title, children, className, badge }: { title?: string; children: ReactNode; className?: string; badge?: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-card animate-fade-up", className)}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-sans text-sm font-semibold tracking-normal">{title}</h2>
          {badge}
        </div>
      )}
      {children}
    </section>
  );
}

export function SourceBadge({ kind }: { kind: "model" | "usage" }) {
  return (
    <span className={cn(
      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
      kind === "model" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
    )}>
      {kind === "model" ? "Model evaluation" : "Uploaded images"}
    </span>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted p-6 text-center">
      <div className="font-semibold">{title}</div>
      {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
