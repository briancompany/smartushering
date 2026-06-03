import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAudit } from "./audit.server";

function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function requireAdmin(token: string) {
  if (!token) throw new Error("Unauthorized");
  const { data } = await supabaseAdmin
    .from("admin_users")
    .select("id, username, session_expires_at")
    .eq("session_token", token)
    .maybeSingle();
  if (!data) throw new Error("Unauthorized");
  if (data.session_expires_at && new Date(data.session_expires_at) < new Date()) {
    throw new Error("Session expired");
  }
  await supabaseAdmin.from("admin_users").update({
    last_active_at: new Date().toISOString(),
    session_expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  }).eq("id", data.id);
  return data;
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ username: z.string().min(1).max(100), password: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    // throttling: 5 failed attempts per username in last 15 minutes
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: fails } = await supabaseAdmin
      .from("admin_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("username", data.username).eq("success", false).gte("created_at", since);
    if ((fails ?? 0) >= 5) {
      throw new Error("Too many failed attempts. Try again in 15 minutes.");
    }
    const { data: rows, error } = await supabaseAdmin.rpc("verify_admin_password", {
      _username: data.username, _password: data.password,
    });
    const user = Array.isArray(rows) ? rows[0] : null;
    if (error || !user) {
      await supabaseAdmin.from("admin_login_attempts").insert({ username: data.username, success: false });
      throw new Error("Invalid username or password");
    }
    const token = randomToken();
    await supabaseAdmin.from("admin_users").update({
      session_token: token,
      session_expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      last_active_at: new Date().toISOString(),
    }).eq("id", user.id);
    await supabaseAdmin.from("admin_login_attempts").insert({ username: data.username, success: true });
    await logAudit({ actor: user.username, action: "admin.login", entity: "admin_user", entity_id: user.id });
    return { token, username: user.username };
  });


export const adminVerify = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const user = await requireAdmin(data.token);
    return { ok: true, username: user.username };
  });

export const adminGetDashboard = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const [bookings, chats] = await Promise.all([
      supabaseAdmin.from("bookings").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("chat_conversations").select("*").order("last_message_at", { ascending: false }),
    ]);
    const all = bookings.data ?? [];
    return {
      stats: {
        total: all.length,
        pending: all.filter((b) => b.status === "pending").length,
        approved: all.filter((b) => b.status === "approved").length,
        rejected: all.filter((b) => b.status === "rejected").length,
        completed: all.filter((b) => b.status === "completed").length,
        activeChats: (chats.data ?? []).filter((c) => c.status === "open").length,
      },
      recentBookings: all.slice(0, 5),
    };
  });

export const adminListBookings = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows } = await supabaseAdmin.from("bookings").select("*").order("created_at", { ascending: false });
    return rows ?? [];
  });

export const adminUpdateBooking = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    id: z.string().uuid(),
    status: z.enum(["pending", "approved", "rejected", "completed"]).optional(),
    admin_notes: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const update: { updated_at: string; status?: "pending" | "approved" | "rejected" | "completed"; admin_notes?: string } = { updated_at: new Date().toISOString() };
    if (data.status) update.status = data.status;
    if (data.admin_notes !== undefined) update.admin_notes = data.admin_notes;
    const { error } = await supabaseAdmin.from("bookings").update(update).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "booking.update", entity: "booking", entity_id: data.id, diff: update });
    return { ok: true };
  });

export const adminUpdatePricing = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    id: z.string().uuid(),
    price_kes: z.number().int().min(0).max(10000000),
  }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("pricing_packages").update({ price_kes: data.price_kes, updated_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "pricing.update", entity: "pricing_package", entity_id: data.id, diff: { price_kes: data.price_kes } });
    return { ok: true };
  });

export const adminUpdateSetting = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), key: z.string().max(64), value: z.string().max(2000) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("site_settings").upsert({ key: data.key, value: data.value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpsertService = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    display_order: z.number().int().min(0).max(1000).default(0),
    is_active: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { token, id, ...rest } = data;
    const payload = { ...rest, updated_at: new Date().toISOString() };
    const q = id
      ? supabaseAdmin.from("services").update(payload).eq("id", id)
      : supabaseAdmin.from("services").insert(payload);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteService = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("services").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpsertFaq = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    id: z.string().uuid().optional(),
    question: z.string().min(1).max(300),
    answer: z.string().min(1).max(2000),
    display_order: z.number().int().min(0).default(0),
    is_active: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { token, id, ...rest } = data;
    const q = id ? supabaseAdmin.from("faqs").update(rest).eq("id", id) : supabaseAdmin.from("faqs").insert(rest);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteFaq = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("faqs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListChats = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows } = await supabaseAdmin.from("chat_conversations").select("*").order("last_message_at", { ascending: false });
    return rows ?? [];
  });

export const adminSendChatMessage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), conversation_id: z.string().uuid(), body: z.string().min(1).max(4000) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("chat_messages").insert({ conversation_id: data.conversation_id, sender: "admin", body: data.body });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("chat_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", data.conversation_id);
    return { ok: true };
  });

export const adminAddGalleryImage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    category: z.string().min(1).max(100),
    image_url: z.string().url().max(2000),
    caption: z.string().max(300).optional(),
    display_order: z.number().int().min(0).default(0),
  }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { token, ...rest } = data;
    const { error } = await supabaseAdmin.from("gallery_images").insert(rest);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteGalleryImage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("gallery_images").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
