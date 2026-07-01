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
    await checkRateLimit(`ticket:${data.submitter_phone}`, 5, 60 * 60 * 1000);
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
      .select("id, ticket_no, category, subject, details, submitter_name, submitter_username, submitter_phone, submitter_email, is_staff, status, priority, admin_response, resolved_at, created_at", { count: "exact" })
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
    const upd: Record<string, unknown> = { handled_by: admin.id };
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
    if (t.category !== "forgot_password") throw new Error("Not a password reset ticket");
    const identifier = t.submitter_username || t.submitter_phone;
    if (!identifier) throw new Error("Ticket has no username or phone");
    const { data: acct } = await supabaseAdmin.from("admin_users")
      .select("id, username, phone").or(`username.eq.${identifier},phone.eq.${identifier}`)
      .maybeSingle();
    if (!acct) throw new Error("No matching account found");
    const { error } = await supabaseAdmin.rpc("update_account_password", { _id: acct.id, _password: data.new_password });
    if (error) throw new Error(error.message);
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
