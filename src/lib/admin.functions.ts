import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAudit } from "./audit.server";

function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type AdminSession = {
  id: string;
  username: string;
  role: string;
  is_super_admin: boolean;
  is_department_head: boolean;
  department: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export async function requireAdmin(token: string): Promise<AdminSession> {
  if (!token) throw new Error("Unauthorized");
  const { data } = await supabaseAdmin
    .from("admin_users")
    .select("id, username, session_expires_at, role, is_super_admin, is_department_head, department, full_name, is_active, avatar_url")
    .eq("session_token", token)
    .maybeSingle();
  if (!data) throw new Error("Unauthorized");
  if (!data.is_active) throw new Error("Account is not active. Contact admin.");
  if (data.session_expires_at && new Date(data.session_expires_at) < new Date()) {
    throw new Error("Session expired");
  }
  await supabaseAdmin.from("admin_users").update({
    last_active_at: new Date().toISOString(),
    session_expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  }).eq("id", data.id);
  return {
    id: data.id, username: data.username, role: data.role,
    is_super_admin: data.is_super_admin, is_department_head: data.is_department_head,
    department: data.department, full_name: data.full_name,
    avatar_url: data.avatar_url ?? null,
  };
}

export async function requireRole(token: string, allowed: string[]) {
  const sess = await requireAdmin(token);
  if (sess.is_super_admin) return sess;
  if (!allowed.includes(sess.role)) throw new Error("Forbidden: insufficient role");
  return sess;
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    identifier: z.string().min(1).max(120),
    password: z.string().min(1).max(200),
    remember: z.boolean().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: fails } = await supabaseAdmin
      .from("admin_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("username", data.identifier).eq("success", false).gte("created_at", since);
    if ((fails ?? 0) >= 5) throw new Error("Too many failed attempts. Try again in 15 minutes.");

    const { data: rows, error } = await supabaseAdmin.rpc("verify_login", {
      _identifier: data.identifier, _password: data.password,
    });
    const user = Array.isArray(rows) ? rows[0] : null;
    if (error || !user) {
      await supabaseAdmin.from("admin_login_attempts").insert({ username: data.identifier, success: false });
      // Differentiate: was the account inactive?
      const { data: chk } = await supabaseAdmin.from("admin_users")
        .select("is_active")
        .or(`username.eq.${data.identifier},staff_id.eq.${data.identifier},phone.eq.${data.identifier}`)
        .maybeSingle();
      if (chk && chk.is_active === false) throw new Error("Your account has been deactivated. Contact support at Smartushering@gmail.com or 0113 867 444.");
      throw new Error("Invalid credentials");
    }
    const token = randomToken();
    const sessionHours = data.remember ? 30 * 24 : 8;
    await supabaseAdmin.from("admin_users").update({
      session_token: token,
      session_expires_at: new Date(Date.now() + sessionHours * 60 * 60 * 1000).toISOString(),
      last_active_at: new Date().toISOString(),
      remember_me_until: data.remember ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
    }).eq("id", user.id);
    await supabaseAdmin.from("admin_login_attempts").insert({ username: data.identifier, success: true });
    const { data: prof } = await supabaseAdmin.from("admin_users").select("avatar_url").eq("id", user.id).maybeSingle();
    await logAudit({ actor: user.username, action: "admin.login", entity: "admin_user", entity_id: user.id });
    return {
      token,
      username: user.username,
      role: user.role,
      is_super_admin: user.is_super_admin,
      is_department_head: user.is_department_head,
      department: user.department,
      full_name: user.full_name,
      avatar_url: prof?.avatar_url ?? null,
    };
  });

export const adminVerify = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const s = await requireAdmin(data.token);
    return { ok: true, ...s };
  });

export const adminLogout = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await supabaseAdmin.from("admin_users").update({ session_token: null, session_expires_at: null, remember_me_until: null }).eq("session_token", data.token);
    return { ok: true };
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
    await requireRole(data.token, ["bookings_operations", "customer_support"]);
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
    const admin = await requireRole(data.token, ["bookings_operations"]);
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
    const admin = await requireRole(data.token, ["bookings_operations"]);
    const { error } = await supabaseAdmin.from("pricing_packages").update({ price_kes: data.price_kes, updated_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "pricing.update", entity: "pricing_package", entity_id: data.id, diff: { price_kes: data.price_kes } });
    return { ok: true };
  });

export const adminUpdateSetting = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), key: z.string().max(64), value: z.string().max(2000) }).parse(d))
  .handler(async ({ data }) => {
    await requireRole(data.token, ["media_content"]);
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
    await requireRole(data.token, ["media_content"]);
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
    await requireRole(data.token, ["media_content"]);
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
    await requireRole(data.token, ["media_content"]);
    const { token, id, ...rest } = data;
    const q = id ? supabaseAdmin.from("faqs").update(rest).eq("id", id) : supabaseAdmin.from("faqs").insert(rest);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteFaq = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireRole(data.token, ["media_content"]);
    const { error } = await supabaseAdmin.from("faqs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListChats = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireRole(data.token, ["customer_support"]);
    const { data: rows } = await supabaseAdmin.from("chat_conversations").select("*").order("last_message_at", { ascending: false });
    return rows ?? [];
  });

export const adminSendChatMessage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), conversation_id: z.string().uuid(), body: z.string().min(1).max(4000) }).parse(d))
  .handler(async ({ data }) => {
    await requireRole(data.token, ["customer_support"]);
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
    await requireRole(data.token, ["media_content"]);
    const { token, ...rest } = data;
    const { error } = await supabaseAdmin.from("gallery_images").insert(rest);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteGalleryImage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireRole(data.token, ["media_content"]);
    const { error } = await supabaseAdmin.from("gallery_images").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- RBAC: Account management (Super Admin only) ---------------- */

const ROLE_ENUM = z.enum([
  "super_admin", "staff_management", "bookings_operations",
  "customer_support", "media_content", "finance_reporting", "staff",
]);

async function requireSuperAdmin(token: string) {
  const s = await requireAdmin(token);
  if (!s.is_super_admin) throw new Error("Forbidden: Super Admin only");
  return s;
}

export const adminListAccounts = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireSuperAdmin(data.token);
    const { data: rows } = await supabaseAdmin
      .from("admin_users")
      .select("id, username, full_name, staff_id, phone, email, role, department, is_super_admin, is_department_head, is_active, created_at, last_active_at, avatar_url")
      .order("created_at", { ascending: false });
    return rows ?? [];
  });

export const adminCreateAccount = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    full_name: z.string().min(1).max(120),
    username: z.string().min(3).max(60).regex(/^[a-zA-Z0-9_.-]+$/),
    staff_id: z.string().min(1).max(40).regex(/^[A-Z0-9-]+$/i),
    phone: z.string().min(7).max(20).regex(/^[0-9+\s-]+$/),
    email: z.string().email().max(160).optional().or(z.literal("")),
    password: z.string().min(8).max(100),
    role: ROLE_ENUM,
    department: z.string().max(80).optional().or(z.literal("")),
    is_department_head: z.boolean().default(false),
  }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireSuperAdmin(data.token);
    const { data: newId, error } = await supabaseAdmin.rpc("create_staff_account", {
      _full_name: data.full_name,
      _username: data.username,
      _staff_id: data.staff_id,
      _phone: data.phone,
      _password: data.password,
      _role: data.role,
      _department: data.department || "",
      _is_department_head: data.is_department_head,
      _created_by: admin.id,
      _email: data.email || undefined,
    });
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "account.create", entity: "admin_user", entity_id: newId as string, diff: { username: data.username, role: data.role } });
    return { id: newId as string };
  });

export const adminUpdateAccount = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    id: z.string().uuid(),
    is_active: z.boolean().optional(),
    is_department_head: z.boolean().optional(),
    department: z.string().max(80).optional(),
    phone: z.string().max(20).optional(),
    email: z.string().email().max(160).optional().or(z.literal("")),
    full_name: z.string().max(120).optional(),
    new_password: z.string().min(8).max(100).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireSuperAdmin(data.token);
    const upd: { is_active?: boolean; department?: string; phone?: string; email?: string | null; full_name?: string; is_department_head?: boolean } = {};
    if (data.is_active !== undefined) upd.is_active = data.is_active;
    if (data.department !== undefined) upd.department = data.department;
    if (data.phone !== undefined) upd.phone = data.phone;
    if (data.email !== undefined) upd.email = data.email || null;
    if (data.full_name !== undefined) upd.full_name = data.full_name;

    if (data.is_department_head === true) {
      const { data: target } = await supabaseAdmin.from("admin_users").select("role").eq("id", data.id).maybeSingle();
      if (target?.role) {
        await supabaseAdmin.from("admin_users").update({ is_department_head: false }).eq("role", target.role).eq("is_department_head", true);
      }
      upd.is_department_head = true;
    } else if (data.is_department_head === false) {
      upd.is_department_head = false;
    }

    if (Object.keys(upd).length > 0) {
      // Deactivating? Also revoke any active session so they can't keep using a logged-in tab.
      if (upd.is_active === false) {
        await supabaseAdmin.from("admin_users").update({ session_token: null, session_expires_at: null, remember_me_until: null }).eq("id", data.id);
      }
      const { error } = await supabaseAdmin.from("admin_users").update(upd).eq("id", data.id);
      if (error) throw new Error(error.message);
    }

    if (data.new_password) {
      const { error } = await supabaseAdmin.rpc("update_account_password", { _id: data.id, _password: data.new_password });
      if (error) throw new Error(error.message);
    }

    await logAudit({ actor: admin.username, action: "account.update", entity: "admin_user", entity_id: data.id, diff: { ...upd, password_changed: !!data.new_password } });
    return { ok: true };
  });

export const adminRevokeSession = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireSuperAdmin(data.token);
    await supabaseAdmin.from("admin_users").update({ session_token: null, session_expires_at: null, remember_me_until: null }).eq("id", data.id);
    await logAudit({ actor: admin.username, action: "account.revoke_session", entity: "admin_user", entity_id: data.id });
    return { ok: true };
  });

export const adminDeleteAccount = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireSuperAdmin(data.token);
    if (admin.id === data.id) throw new Error("You cannot delete your own account");
    const { error } = await supabaseAdmin.from("admin_users").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "account.delete", entity: "admin_user", entity_id: data.id });
    return { ok: true };
  });

/* ---------------- Profile picture ---------------- */
export const getMyProfile = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireAdmin(data.token);
    return { id: me.id, username: me.username, full_name: me.full_name, avatar_url: me.avatar_url };
  });

export const updateMyAvatar = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string().min(1),
    avatar_url: z.string().url().max(2000).nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireAdmin(data.token);
    const { error } = await supabaseAdmin
      .from("admin_users").update({ avatar_url: data.avatar_url }).eq("id", me.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: me.username, action: "profile.avatar_update", entity: "admin_user", entity_id: me.id });
    return { ok: true, avatar_url: data.avatar_url };
  });
