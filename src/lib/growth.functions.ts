import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAudit } from "./audit.server";

async function requireAdmin(token: string) {
  if (!token) throw new Error("Unauthorized");
  const { data } = await supabaseAdmin.from("admin_users").select("id, username, is_active, session_expires_at").eq("session_token", token).maybeSingle();
  if (!data || !data.is_active) throw new Error("Unauthorized");
  if (data.session_expires_at && new Date(data.session_expires_at) < new Date()) throw new Error("Session expired");
  return data;
}

/* ---------------- Leads ---------------- */
export const adminListLeads = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows } = await supabaseAdmin.from("leads").select("*").order("created_at", { ascending: false });
    return rows ?? [];
  });

export const adminDeleteLead = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("leads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "lead.delete", entity: "lead", entity_id: data.id });
    return { ok: true };
  });

/* ---------------- Callback requests ---------------- */
export const adminListCallbacks = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows } = await supabaseAdmin.from("callback_requests").select("*").order("created_at", { ascending: false });
    return rows ?? [];
  });

export const adminUpdateCallback = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid(), status: z.enum(["new", "contacted", "done"]) }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("callback_requests").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "callback.update", entity: "callback_request", entity_id: data.id, diff: { status: data.status } });
    return { ok: true };
  });

export const adminDeleteCallback = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("callback_requests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "callback.delete", entity: "callback_request", entity_id: data.id });
    return { ok: true };
  });

/* ---------------- Promo codes ---------------- */
const promoSchema = z.object({
  token: z.string(),
  id: z.string().uuid().optional(),
  code: z.string().trim().min(3).max(40),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().int().min(1).max(1_000_000),
  max_uses: z.number().int().min(1).max(100000).nullable().optional(),
  expires_at: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  note: z.string().max(300).nullable().optional(),
});

export const adminListPromoCodes = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows } = await supabaseAdmin.from("promo_codes").select("*").order("created_at", { ascending: false });
    return rows ?? [];
  });

export const adminUpsertPromoCode = createServerFn({ method: "POST" })
  .inputValidator((d) => promoSchema.parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const row = {
      code: data.code.toUpperCase(),
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      max_uses: data.max_uses ?? null,
      expires_at: data.expires_at || null,
      is_active: data.is_active ?? true,
      note: data.note ?? null,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("promo_codes").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      await logAudit({ actor: admin.username, action: "promo.update", entity: "promo_code", entity_id: data.id, diff: row });
    } else {
      const { data: created, error } = await supabaseAdmin.from("promo_codes").insert(row).select("id").single();
      if (error) throw new Error(error.message);
      await logAudit({ actor: admin.username, action: "promo.create", entity: "promo_code", entity_id: created?.id });
    }
    return { ok: true };
  });

export const adminDeletePromoCode = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("promo_codes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "promo.delete", entity: "promo_code", entity_id: data.id });
    return { ok: true };
  });

/* ---------------- Blocked (closed) dates ---------------- */
export const adminListBlockedDates = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows } = await supabaseAdmin.from("blocked_dates").select("*").order("date", { ascending: false });
    return rows ?? [];
  });

export const adminAddBlockedDate = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reason: z.string().max(200).optional() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { data: created, error } = await supabaseAdmin.from("blocked_dates").insert({ date: data.date, reason: data.reason || null }).select("id").single();
    if (error) throw new Error(error.message.includes("duplicate") ? "That date is already closed" : error.message);
    await logAudit({ actor: admin.username, action: "blocked_date.create", entity: "blocked_date", entity_id: created?.id, diff: { date: data.date } });
    return { ok: true };
  });

export const adminDeleteBlockedDate = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("blocked_dates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "blocked_date.delete", entity: "blocked_date", entity_id: data.id });
    return { ok: true };
  });

/* ---------------- Add-ons ---------------- */
export const adminListAddOns = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows } = await supabaseAdmin.from("add_ons").select("*").order("display_order");
    return rows ?? [];
  });

export const adminUpsertAddOn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(120),
    description: z.string().max(300).optional(),
    price_kes: z.number().int().min(0).max(1_000_000),
    unit: z.enum(["per_day", "per_usher", "per_event"]),
    is_active: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const row = {
      name: data.name,
      description: data.description || null,
      price_kes: data.price_kes,
      unit: data.unit,
      is_active: data.is_active ?? true,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("add_ons").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      await logAudit({ actor: admin.username, action: "add_on.update", entity: "add_on", entity_id: data.id, diff: row });
    } else {
      const { data: created, error } = await supabaseAdmin.from("add_ons").insert({ ...row, display_order: 99 }).select("id").single();
      if (error) throw new Error(error.message);
      await logAudit({ actor: admin.username, action: "add_on.create", entity: "add_on", entity_id: created?.id });
    }
    return { ok: true };
  });

export const adminDeleteAddOn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("add_ons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "add_on.delete", entity: "add_on", entity_id: data.id });
    return { ok: true };
  });

/* ---------------- Referral codes ---------------- */
export const adminListReferrals = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows } = await supabaseAdmin.from("referral_codes").select("*").order("created_at", { ascending: false });
    return rows ?? [];
  });

export const adminUpsertReferral = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    id: z.string().uuid().optional(),
    code: z.string().trim().min(3).max(40),
    referrer_name: z.string().trim().min(2).max(120),
    referrer_phone: z.string().trim().max(40).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const row = {
      code: data.code.toUpperCase(),
      referrer_name: data.referrer_name,
      referrer_phone: data.referrer_phone || null,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("referral_codes").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      await logAudit({ actor: admin.username, action: "referral.update", entity: "referral_code", entity_id: data.id, diff: row });
    } else {
      const { data: created, error } = await supabaseAdmin.from("referral_codes").insert(row).select("id").single();
      if (error) throw new Error(error.message.includes("duplicate") ? "That referral code already exists" : error.message);
      await logAudit({ actor: admin.username, action: "referral.create", entity: "referral_code", entity_id: created?.id, diff: row });
    }
    return { ok: true };
  });

export const adminUpdateReferralReward = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid(), reward_given: z.boolean(), reward_code: z.string().max(60).nullable().optional() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("referral_codes").update({ reward_given: data.reward_given, reward_code: data.reward_code ?? null }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "referral.reward", entity: "referral_code", entity_id: data.id, diff: { reward_given: data.reward_given } });
    return { ok: true };
  });

export const adminDeleteReferral = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("referral_codes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "referral.delete", entity: "referral_code", entity_id: data.id });
    return { ok: true };
  });

/* ---------------- Articles (planning guides) ---------------- */
const articleSchema = z.object({
  token: z.string(),
  id: z.string().uuid().optional(),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only").min(3).max(120),
  title: z.string().trim().min(5).max(200),
  excerpt: z.string().trim().max(400),
  body: z.string().trim().min(20),
  author: z.string().trim().max(120).optional(),
  is_published: z.boolean().optional(),
});

export const adminListArticles = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows } = await supabaseAdmin.from("articles").select("*").order("created_at", { ascending: false });
    return rows ?? [];
  });

export const adminUpsertArticle = createServerFn({ method: "POST" })
  .inputValidator((d) => articleSchema.parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const row = {
      slug: data.slug,
      title: data.title,
      excerpt: data.excerpt,
      body: data.body,
      author: data.author || "Smart Ushering Team",
      is_published: data.is_published ?? true,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("articles").update(row).eq("id", data.id);
      if (error) throw new Error(error.message.includes("duplicate") ? "That link address is already in use" : error.message);
      await logAudit({ actor: admin.username, action: "article.update", entity: "article", entity_id: data.id, diff: { title: row.title } });
    } else {
      const { data: created, error } = await supabaseAdmin.from("articles").insert({ ...row, published_at: new Date().toISOString() }).select("id").single();
      if (error) throw new Error(error.message.includes("duplicate") ? "That link address is already in use" : error.message);
      await logAudit({ actor: admin.username, action: "article.create", entity: "article", entity_id: created?.id, diff: { title: row.title } });
    }
    return { ok: true };
  });

export const adminDeleteArticle = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("articles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "article.delete", entity: "article", entity_id: data.id });
    return { ok: true };
  });
