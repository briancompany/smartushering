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

  // ---- Database: ping every user-facing table (HEAD count = cheap, no data transfer) ----
  await time("db.public_tables", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tables = [
      "services", "pricing_packages", "faqs", "reviews", "gallery",
      "bookings", "contacts", "chat_messages", "notifications",
      "audit_logs", "staff", "booking_assignments", "quotes",
      "announcements", "grievances", "assets",
      "admin_users", "admin_login_attempts", "support_tickets",
      "rate_limits",
    ];
    await Promise.all(
      tables.map((t) =>
        supabaseAdmin.from(t as never).select("*", { count: "exact", head: true }),
      ),
    );
  });

  // ---- Storage: list private buckets so the storage worker stays warm ----
  await time("db.storage", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.all([
      supabaseAdmin.storage.from("quotes").list("", { limit: 1 }),
      supabaseAdmin.storage.from("backups").list("", { limit: 1 }),
    ]);
  });

  // ---- Auth: touch the Auth Admin API so its worker stays hot ----
  await time("db.auth", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
  });

  // ---- RPC: exercise the security-definer functions used on every login ----
  await time("db.rpc", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Deliberately-bogus credentials — we only want the function compiled/cached.
    await supabaseAdmin.rpc("verify_admin_password" as never, {
      p_identifier: "__warmup__",
      p_password: "__warmup__",
    } as never);
  });

  // ---- Server modules: import every server-function bundle so V8 has them JIT'd ----
  await time("modules.server_functions", async () => {
    await Promise.all([
      import("@/lib/admin.functions"),
      import("@/lib/admin-phase2.functions"),
      import("@/lib/phase3.functions"),
      import("@/lib/reviews.functions"),
      import("@/lib/backups.functions"),
      import("@/lib/tickets.functions"),
      import("@/lib/audit.server"),
      import("@/lib/rate-limit.server"),
      import("@/lib/pdf-quote.server"),
      import("@/lib/config.server"),
    ]);
  });

  // ---- SSR: hit the homepage to warm the React SSR pipeline + route tree ----
  await time("ssr.homepage", async () => {
    const { origin } = new URL(
      (globalThis as { location?: { href?: string } }).location?.href ??
        "https://smartushering.lovable.app/",
    );
    const res = await fetch(`${origin}/?warmup=1`, {
      headers: { "user-agent": "smart-ushering-warmup/1.0" },
    });
    // Drain body so the Worker completes the response cycle.
    await res.arrayBuffer();
  });


  const total_ms = Date.now() - started;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs").insert({
      action: "system.warmup",
      actor: source,
      entity: "system",
      diff: { source, total_ms, results },
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
