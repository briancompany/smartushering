// Warm-up endpoint — pinged every 6 hours by pg_cron and manually from the admin panel.
// Touches the DB and key server modules so cold Workers stay warm.
import { createFileRoute } from "@tanstack/react-router";

async function runWarmup(source: "cron" | "manual") {
  const started = Date.now();
  const results: Record<string, { ok: boolean; ms: number; error?: string }> = {};

  const time = async (name: string, fn: () => Promise<unknown>) => {
    const t = Date.now();
    try { await fn(); results[name] = { ok: true, ms: Date.now() - t }; }
    catch (e) { results[name] = { ok: false, ms: Date.now() - t, error: e instanceof Error ? e.message : String(e) }; }
  };

  await time("db", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("services").select("id", { count: "exact", head: true });
    await supabaseAdmin.from("pricing_packages").select("id", { count: "exact", head: true });
    await supabaseAdmin.from("faqs").select("id", { count: "exact", head: true });
    await supabaseAdmin.from("reviews").select("id", { count: "exact", head: true });
  });

  await time("modules", async () => {
    await Promise.all([
      import("@/lib/admin.functions"),
      import("@/lib/phase3.functions"),
      import("@/lib/reviews.functions"),
      import("@/lib/backups.functions"),
    ]);
  });

  const total_ms = Date.now() - started;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs").insert({
      action: "system.warmup",
      entity_type: "system",
      metadata: { source, total_ms, results },
    });
  } catch { /* audit is best-effort */ }

  return { ok: true, source, total_ms, results, at: new Date().toISOString() };
}

export const Route = createFileRoute("/api/public/hooks/warmup")({
  server: {
    handlers: {
      GET: async () => Response.json(await runWarmup("cron")),
      POST: async ({ request }) => {
        let source: "cron" | "manual" = "cron";
        try { const b = await request.json() as { source?: "cron" | "manual" }; if (b?.source === "manual") source = "manual"; } catch { /* empty body ok */ }
        return Response.json(await runWarmup(source));
      },
    },
  },
});
