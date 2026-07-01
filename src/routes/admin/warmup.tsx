import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Flame, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";

export const Route = createFileRoute("/admin/warmup")({
  head: () => ({ meta: [{ title: "System Warm-up — Admin" }] }),
  component: Page,
});

type WarmupResult = {
  ok: boolean; source: string; total_ms: number; at: string;
  results: Record<string, { ok: boolean; ms: number; error?: string }>;
};

function Page() {
  const token = useAdminToken();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<WarmupResult | null>(null);

  if (!token) return null;

  const run = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/public/hooks/warmup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "manual" }),
      });
      const data = await r.json() as WarmupResult;
      setLast(data);
      toast.success(`Warm-up complete in ${data.total_ms}ms`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Warm-up failed");
    } finally { setBusy(false); }
  };

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-semibold text-navy"><Flame className="h-6 w-6 text-gold" /> System Warm-up</h1>
          <p className="text-sm text-muted-foreground">Runs automatically every 6 hours to prevent cold starts. You can also trigger it manually.</p>
        </div>
        <button onClick={run} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> {busy ? "Warming up…" : "Warm up now"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs uppercase text-muted-foreground">Schedule</div>
          <div className="mt-1 text-lg font-semibold text-navy">Every 6 hours</div>
          <p className="mt-1 text-xs text-muted-foreground">Automated via database scheduler</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs uppercase text-muted-foreground">Last run</div>
          <div className="mt-1 text-lg font-semibold text-navy">{last ? new Date(last.at).toLocaleTimeString() : "—"}</div>
          <p className="mt-1 text-xs text-muted-foreground">{last ? `${last.total_ms}ms` : "No manual run yet in this session"}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs uppercase text-muted-foreground">Status</div>
          <div className="mt-1 text-lg font-semibold text-emerald-700">Operational</div>
          <p className="mt-1 text-xs text-muted-foreground">Warms DB + server modules</p>
        </div>
      </div>

      {last && (
        <div className="mt-6 rounded-xl border bg-white p-4">
          <h2 className="font-display text-lg font-semibold text-navy">Latest results</h2>
          <div className="mt-3 divide-y">
            {Object.entries(last.results).map(([name, r]) => (
              <div key={name} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-2">
                  {r.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />}
                  <span className="font-medium capitalize">{name}</span>
                  {r.error && <span className="text-xs text-rose-600">{r.error}</span>}
                </div>
                <span className="font-mono text-xs text-muted-foreground">{r.ms}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
