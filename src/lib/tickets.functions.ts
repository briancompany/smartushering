import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAudit } from "./audit.server";
import { checkRateLimit } from "./rate-limit.server";

const CATEGORIES = ["forgot_password","account_help","bug_report","feature_request","general","complaint","other"] as const;
const STATUSES = ["open","in_progress","resolved","closed"] as const;
const PRIORITIES = ["low","normal","high","urgent"] as const;

async function requireAdmin(token: string) {
  if (!token) throw new Error("Unauthorized");
  const { data } = await supabaseAdmin.from("admin_users")
    .select("id, username, is_active, session_expires_at")
    .eq("session_token", token).maybeSingle();
  if (!data || !data.is_active) throw new Error("Unauthorized");
  if (data.session_expires_at && new Date(data.session_expires_at) < new Date()) throw new Error("Session expired");
  return { id: data.id, username: data.username };
}

async function requireSession(token: string) {
  if (!token) throw new Error("Unauthorized");
  const { data } = await supabaseAdmin.from("admin_users")
    .select("id, username, full_name, phone, is_active, session_expires_at")
    .eq("session_token", token).maybeSingle();
  if (!data || !data.is_active) throw new Error("Unauthorized");
  if (data.session_expires_at && new Date(data.session_expires_at) < new Date()) throw new Error("Session expired");
  return data;
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz";
  const symbols = "!@#$%*";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  out += symbols[Math.floor(Math.random() * symbols.length)];
  out += Math.floor(Math.random() * 10);
  return out;
}

export const submitTicket = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    category: z.enum(CATEGORIES),
    subject: z.string().trim().min(3).max(160),
    details: z.string().trim().max(4000).optional(),
    submitter_name: z.string().trim().min(1).max(120),
    submitter_username: z.string().trim().max(60).optional(),
    submitter_phone: z.string().trim().min(7).max(20),
    submitter_email: z.string().trim().email().max(160).optional().or(z.literal("")),
    is_staff: z.boolean().default(false),
    priority: z.enum(PRIORITIES).default("normal"),
  }).parse(d))
  .handler(async ({ data }) => {
    const ok = await checkRateLimit({ bucket: "ticket", identifier: data.submitter_phone, limit: 5, windowSeconds: 60 * 60 });
    if (!ok) throw new Error("Too many tickets. Please try again later.");
    const { data: row, error } = await supabaseAdmin.from("support_tickets").insert({
      category: data.category,
      subject: data.subject,
      details: data.details ?? null,
      submitter_name: data.submitter_name,
      submitter_username: data.submitter_username || null,
      submitter_phone: data.submitter_phone,
      submitter_email: data.submitter_email || null,
      is_staff: data.is_staff,
      priority: data.priority,
    }).select("id, ticket_no").single();
    if (error) throw new Error(error.message);
    return { id: row.id, ticket_no: row.ticket_no };
  });

/* Staff-authenticated ticket submission (auto-fills identity) */
export const staffSubmitTicket = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    category: z.enum(CATEGORIES),
    subject: z.string().trim().min(3).max(160),
    details: z.string().trim().max(4000).optional(),
    priority: z.enum(PRIORITIES).default("normal"),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireSession(data.token);
    const { data: row, error } = await supabaseAdmin.from("support_tickets").insert({
      category: data.category, subject: data.subject, details: data.details ?? null,
      submitter_name: me.full_name ?? me.username,
      submitter_username: me.username,
      submitter_phone: me.phone ?? "",
      is_staff: true, priority: data.priority,
    }).select("id, ticket_no").single();
    if (error) throw new Error(error.message);
    return { id: row.id, ticket_no: row.ticket_no };
  });

/* Staff — list only my own tickets */
export const staffListMyTickets = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireSession(data.token);
    const { data: rows } = await supabaseAdmin.from("support_tickets")
      .select("id, ticket_no, category, subject, status, priority, admin_response, resolved_at, created_at")
      .or(`submitter_username.eq.${me.username},submitter_phone.eq.${me.phone ?? ""}`)
      .order("created_at", { ascending: false }).limit(50);
    return rows ?? [];
  });

/* Public tracking — anyone with ticket_no + phone */
export const publicTrackTicket = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    ticket_no: z.string().trim().min(3).max(40),
    phone: z.string().trim().min(4).max(20),
  }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin.from("support_tickets")
      .select("ticket_no, category, subject, status, priority, admin_response, resolved_at, created_at, submitter_phone")
      .eq("ticket_no", data.ticket_no.toUpperCase()).maybeSingle();
    if (!row) throw new Error("Ticket not found");
    const last4 = (row.submitter_phone ?? "").replace(/\D/g, "").slice(-4);
    const given = data.phone.replace(/\D/g, "").slice(-4);
    if (last4 !== given) throw new Error("Phone verification failed");
    const { submitter_phone: _p, ...safe } = row;
    void _p;
    return safe;
  });

export const adminListTickets = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
    status: z.enum(STATUSES).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = supabaseAdmin.from("support_tickets")
      .select("id, ticket_no, category, subject, details, submitter_name, submitter_username, submitter_phone, submitter_email, is_staff, status, priority, admin_response, resolved_at, reset_token, reset_token_expires_at, reset_used_at, created_at", { count: "exact" })
      .order("created_at", { ascending: false }).range(from, to);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const adminUpdateTicket = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    id: z.string().uuid(),
    status: z.enum(STATUSES).optional(),
    admin_response: z.string().trim().max(4000).optional(),
    priority: z.enum(PRIORITIES).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const upd: { handled_by: string; status?: typeof STATUSES[number]; resolved_at?: string; admin_response?: string; priority?: typeof PRIORITIES[number] } = { handled_by: admin.id };
    if (data.status) {
      upd.status = data.status;
      if (data.status === "resolved" || data.status === "closed") upd.resolved_at = new Date().toISOString();
    }
    if (data.admin_response !== undefined) upd.admin_response = data.admin_response;
    if (data.priority) upd.priority = data.priority;
    const { error } = await supabaseAdmin.from("support_tickets").update(upd).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "ticket.update", entity: "support_ticket", entity_id: data.id, diff: upd });
    return { ok: true };
  });

/* Auto-generate temp password (24h) + secure reset link, mark ticket in progress.
   Returns password, phone, username, ticket_no, reset_url. */
export const adminGenerateTicketPassword = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    id: z.string().uuid(),
    origin: z.string().url().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { data: t } = await supabaseAdmin.from("support_tickets")
      .select("submitter_username, submitter_phone, submitter_name, category, ticket_no")
      .eq("id", data.id).maybeSingle();
    if (!t) throw new Error("Ticket not found");
    const identifier = t.submitter_username || t.submitter_phone;
    if (!identifier) throw new Error("Ticket has no username or phone");
    const { data: acct } = await supabaseAdmin.from("admin_users")
      .select("id, username, phone").or(`username.eq.${identifier},phone.eq.${identifier}`)
      .maybeSingle();
    if (!acct) throw new Error("No matching account found");
    const tempPassword = generateTempPassword();
    const { error: pwErr } = await supabaseAdmin.rpc("update_account_password", { _id: acct.id, _password: tempPassword });
    if (pwErr) throw new Error(pwErr.message);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from("admin_users").update({
      must_change_password: true, temp_password_expires_at: expiresAt,
    }).eq("id", acct.id);
    const resetToken = crypto.randomUUID();
    await supabaseAdmin.from("support_tickets").update({
      status: "in_progress",
      admin_response: `Temporary password issued by ${admin.username}. Valid 24 hours. Sent to ${acct.phone} via WhatsApp.`,
      handled_by: admin.id,
      reset_token: resetToken,
      reset_token_expires_at: expiresAt,
      reset_used_at: null,
    }).eq("id", data.id);
    const origin = data.origin || "https://smartushering.lovable.app";
    const resetUrl = `${origin}/reset-password?token=${resetToken}`;
    await logAudit({ actor: admin.username, action: "ticket.temp_password", entity: "admin_user", entity_id: acct.id, diff: { ticket_id: data.id, expires_at: expiresAt } });
    return {
      ok: true,
      username: acct.username ?? "",
      phone: acct.phone ?? "",
      ticket_no: t.ticket_no,
      submitter_name: t.submitter_name,
      password: tempPassword,
      reset_url: resetUrl,
      expires_at: expiresAt,
    };
  });

/* Public — look up ticket by reset token to render the reset form */
export const getResetContext = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: t } = await supabaseAdmin.from("support_tickets")
      .select("id, ticket_no, submitter_name, submitter_username, reset_token_expires_at, reset_used_at")
      .eq("reset_token", data.token).maybeSingle();
    if (!t) throw new Error("Invalid or expired link");
    if (t.reset_used_at) throw new Error("This link has already been used");
    if (!t.reset_token_expires_at || new Date(t.reset_token_expires_at) < new Date()) throw new Error("This link has expired");
    return {
      ticket_no: t.ticket_no,
      name: t.submitter_name,
      username: t.submitter_username,
      expires_at: t.reset_token_expires_at,
    };
  });

/* Public — apply the new password using a reset token */
export const applyPasswordChange = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string().uuid(),
    new_password: z.string().min(8).max(100),
  }).parse(d))
  .handler(async ({ data }) => {
    const ok = await checkRateLimit({ bucket: "pw_reset", identifier: data.token, limit: 5, windowSeconds: 60 * 15 });
    if (!ok) throw new Error("Too many attempts, try again later");
    const { data: t } = await supabaseAdmin.from("support_tickets")
      .select("id, submitter_username, submitter_phone, reset_token_expires_at, reset_used_at, ticket_no")
      .eq("reset_token", data.token).maybeSingle();
    if (!t) throw new Error("Invalid link");
    if (t.reset_used_at) throw new Error("This link has already been used");
    if (!t.reset_token_expires_at || new Date(t.reset_token_expires_at) < new Date()) throw new Error("Link expired");
    const identifier = t.submitter_username || t.submitter_phone;
    const { data: acct } = await supabaseAdmin.from("admin_users")
      .select("id, username").or(`username.eq.${identifier},phone.eq.${identifier}`).maybeSingle();
    if (!acct) throw new Error("Account not found");
    const { error } = await supabaseAdmin.rpc("update_account_password", { _id: acct.id, _password: data.new_password });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_users").update({
      must_change_password: false, temp_password_expires_at: null,
    }).eq("id", acct.id);
    await supabaseAdmin.from("support_tickets").update({
      reset_used_at: new Date().toISOString(),
      status: "resolved",
      resolved_at: new Date().toISOString(),
      admin_response: `Password successfully changed by user via secure link (ticket ${t.ticket_no}).`,
    }).eq("id", t.id);
    await logAudit({ actor: acct.username ?? "self", action: "password.self_reset", entity: "admin_user", entity_id: acct.id, diff: { ticket_id: t.id } });
    return { ok: true };
  });

/* Legacy — admin sets a manual password (kept for compatibility) */
export const adminResetTicketPassword = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    id: z.string().uuid(),
    new_password: z.string().min(8).max(100),
  }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { data: t } = await supabaseAdmin.from("support_tickets")
      .select("submitter_username, submitter_phone, category").eq("id", data.id).maybeSingle();
    if (!t) throw new Error("Ticket not found");
    const identifier = t.submitter_username || t.submitter_phone;
    if (!identifier) throw new Error("Ticket has no username or phone");
    const { data: acct } = await supabaseAdmin.from("admin_users")
      .select("id, username, phone").or(`username.eq.${identifier},phone.eq.${identifier}`)
      .maybeSingle();
    if (!acct) throw new Error("No matching account found");
    const { error } = await supabaseAdmin.rpc("update_account_password", { _id: acct.id, _password: data.new_password });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_users").update({
      must_change_password: false, temp_password_expires_at: null,
    }).eq("id", acct.id);
    await supabaseAdmin.from("support_tickets").update({
      status: "resolved",
      admin_response: `Password reset by ${admin.username}. New password sent via WhatsApp to ${acct.phone}.`,
      handled_by: admin.id,
      resolved_at: new Date().toISOString(),
    }).eq("id", data.id);
    await logAudit({ actor: admin.username, action: "ticket.password_reset", entity: "admin_user", entity_id: acct.id, diff: { ticket_id: data.id } });
    return { ok: true, username: acct.username, phone: acct.phone };
  });

export const adminDeleteTicket = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("support_tickets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "ticket.delete", entity: "support_ticket", entity_id: data.id });
    return { ok: true };
  });
