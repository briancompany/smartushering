import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkRateLimit } from "./rate-limit.server";
import { logAudit } from "./audit.server";

const reviewSchema = z.object({
  author: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  role: z.string().trim().max(120).optional(),
  event_type: z.string().trim().max(120).optional(),
  rating: z.number().int().min(1).max(5),
  quote: z.string().trim().min(10).max(1000),
});

export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((d) => reviewSchema.parse(d))
  .handler(async ({ data }) => {
    let ip = "unknown";
    try { ip = getRequestIP({ xForwardedFor: true }) ?? "unknown"; } catch { /* noop */ }
    const ok = await checkRateLimit({ bucket: "reviews", identifier: ip, limit: 3, windowSeconds: 3600 });
    if (!ok) throw new Error("Too many submissions. Please try again later.");
    const { error } = await supabaseAdmin.from("reviews").insert({
      author: data.author,
      email: data.email || null,
      role: data.role || null,
      event_type: data.event_type || null,
      rating: data.rating,
      quote: data.quote,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listApprovedReviews = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("reviews")
      .select("id, author, role, event_type, rating, quote, created_at")
      .eq("is_approved", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

/* ---------- Admin ---------- */
async function requireAdmin(token: string) {
  if (!token) throw new Error("Unauthorized");
  const { data } = await supabaseAdmin.from("admin_users").select("id, username, session_expires_at").eq("session_token", token).maybeSingle();
  if (!data) throw new Error("Unauthorized");
  if (data.session_expires_at && new Date(data.session_expires_at) < new Date()) throw new Error("Session expired");
  return data;
}

export const adminListReviews = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows } = await supabaseAdmin.from("reviews").select("*").order("created_at", { ascending: false });
    return rows ?? [];
  });

export const adminUpdateReview = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    id: z.string().uuid(),
    is_approved: z.boolean().optional(),
    display_order: z.number().int().min(0).max(1000).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const update: { updated_at: string; is_approved?: boolean; display_order?: number } = { updated_at: new Date().toISOString() };
    if (data.is_approved !== undefined) update.is_approved = data.is_approved;
    if (data.display_order !== undefined) update.display_order = data.display_order;
    const { error } = await supabaseAdmin.from("reviews").update(update).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "review.update", entity: "review", entity_id: data.id, diff: update });
    return { ok: true };
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("reviews").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "review.delete", entity: "review", entity_id: data.id });
    return { ok: true };
  });
