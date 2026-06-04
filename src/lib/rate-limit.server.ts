import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Simple DB-backed rate limiter. Returns true if allowed, false if over limit.
 * Best-effort: failures default to ALLOW (don't lock users out on DB hiccup).
 */
export async function checkRateLimit(opts: {
  bucket: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}): Promise<boolean> {
  try {
    const since = new Date(Date.now() - opts.windowSeconds * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("bucket", opts.bucket)
      .eq("identifier", opts.identifier)
      .gte("created_at", since);
    if ((count ?? 0) >= opts.limit) return false;
    await supabaseAdmin.from("rate_limits").insert({ bucket: opts.bucket, identifier: opts.identifier });
    // opportunistic cleanup of old rows for this bucket+identifier
    if (Math.random() < 0.05) {
      const cutoff = new Date(Date.now() - opts.windowSeconds * 1000 * 4).toISOString();
      await supabaseAdmin.from("rate_limits").delete().lt("created_at", cutoff);
    }
    return true;
  } catch (e) {
    console.error("[rate-limit] check failed", e);
    return true;
  }
}
