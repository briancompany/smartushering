import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAudit } from "./audit.server";
import { generateQuotePdf } from "./pdf-quote.server";

async function requireAdmin(token: string) {
  if (!token) throw new Error("Unauthorized");
  const { data } = await supabaseAdmin
    .from("admin_users")
    .select("id, username, session_expires_at")
    .eq("session_token", token)
    .maybeSingle();
  if (!data) throw new Error("Unauthorized");
  if (data.session_expires_at && new Date(data.session_expires_at) < new Date()) {
    throw new Error("Session expired. Please log in again.");
  }
  // sliding session: extend on each call
  await supabaseAdmin
    .from("admin_users")
    .update({
      last_active_at: new Date().toISOString(),
      session_expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", data.id);
  return { id: data.id, username: data.username };
}

const tokenOnly = z.object({ token: z.string().min(1) });

/* ---------------- Notifications ---------------- */
export const adminListNotifications = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenOnly.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows } = await supabaseAdmin
      .from("notifications").select("*").is("target_user_id", null).order("created_at", { ascending: false }).limit(50);
    return rows ?? [];
  });

export const adminMarkNotificationRead = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid().optional(), all: z.boolean().optional() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const q = supabaseAdmin.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    const { error } = data.all ? await q : await q.eq("id", data.id!);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Audit logs ---------------- */
export const adminListAudit = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenOnly.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows } = await supabaseAdmin
      .from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
    return rows ?? [];
  });

/* ---------------- Staff ---------------- */
export const adminListStaff = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenOnly.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows } = await supabaseAdmin.from("staff").select("*").order("full_name");
    return rows ?? [];
  });

export const adminUpsertStaff = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    id: z.string().uuid().optional(),
    full_name: z.string().min(1).max(120),
    phone: z.string().min(7).max(30),
    email: z.string().email().max(200).optional().or(z.literal("")),
    role: z.enum(["usher", "team_leader", "coordinator"]).default("usher"),
    is_active: z.boolean().default(true),
    notes: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { token, id, email, ...rest } = data;
    const payload = { ...rest, email: email || null };
    const q = id ? supabaseAdmin.from("staff").update(payload).eq("id", id) : supabaseAdmin.from("staff").insert(payload).select().single();
    const { error, data: row } = await q;
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: id ? "staff.update" : "staff.create", entity: "staff", entity_id: id ?? (row as { id?: string } | null)?.id ?? null, diff: payload });
    return { ok: true };
  });

export const adminDeleteStaff = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("staff").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "staff.delete", entity: "staff", entity_id: data.id });
    return { ok: true };
  });

/* ---------------- Booking assignments ---------------- */
export const adminListAssignments = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), booking_id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    let q = supabaseAdmin.from("booking_assignments").select("*, staff:staff_id(id, full_name, phone, role), booking:booking_id(id, reference, full_name, event_type, event_date, venue, status)").order("created_at", { ascending: false });
    if (data.booking_id) q = q.eq("booking_id", data.booking_id);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const adminUpsertAssignment = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    id: z.string().uuid().optional(),
    booking_id: z.string().uuid(),
    staff_id: z.string().uuid(),
    is_team_leader: z.boolean().default(false),
    report_time: z.string().optional(),
    status: z.enum(["assigned", "confirmed", "attended", "completed", "cancelled"]).default("assigned"),
    notes: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { token, id, report_time, ...rest } = data;
    const payload = { ...rest, report_time: report_time || null };
    const q = id ? supabaseAdmin.from("booking_assignments").update(payload).eq("id", id) : supabaseAdmin.from("booking_assignments").upsert(payload, { onConflict: "booking_id,staff_id" });
    const { error } = await q;
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: id ? "assignment.update" : "assignment.create", entity: "booking_assignment", entity_id: id ?? null, diff: payload });
    return { ok: true };
  });

export const adminDeleteAssignment = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("booking_assignments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "assignment.delete", entity: "booking_assignment", entity_id: data.id });
    return { ok: true };
  });

/* ---------------- Quotes ---------------- */
export const adminListQuotes = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenOnly.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows } = await supabaseAdmin.from("quotes").select("*").order("created_at", { ascending: false });
    return rows ?? [];
  });

export const adminCreateQuote = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    customer_name: z.string().min(1).max(120),
    customer_email: z.string().email().max(200),
    customer_phone: z.string().max(30).optional(),
    event_type: z.string().min(1).max(120),
    event_date: z.string().optional(),
    event_dates: z.array(z.string()).max(60).optional(),
    number_of_days: z.number().int().min(1).max(60).optional(),
    validity_days: z.number().int().min(1).max(365).default(14),
    venue: z.string().max(200).optional(),
    county: z.string().max(120).optional(),
    package_slug: z.string().max(60),
    number_of_ushers: z.number().int().min(1).max(500),
    /** Transport per usher, per day */
    transport_rate_kes: z.number().int().min(0).max(1000000).default(0),
    notes: z.string().max(1000).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { data: pkg } = await supabaseAdmin.from("pricing_packages").select("*").eq("slug", data.package_slug).maybeSingle();
    if (!pkg) throw new Error("Package not found");

    const dates = Array.from(new Set((data.event_dates ?? []).filter(Boolean))).sort();
    const days = Math.max(1, dates.length || data.number_of_days || 1);
    const firstDate = dates[0] ?? (data.event_date || null);

    const subtotal = pkg.price_kes * data.number_of_ushers * days;
    const transportTotal = data.transport_rate_kes * data.number_of_ushers * days;
    const total = subtotal + transportTotal;
    const validUntil = new Date(Date.now() + data.validity_days * 86400000).toISOString().slice(0, 10);

    const reference = "QT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const { pdf, signedUrl } = await (async () => {
      const r = await generateQuotePdf({
        reference,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        event_type: data.event_type,
        event_date: firstDate,
        event_dates: dates,
        number_of_days: days,
        venue: data.venue,
        county: data.county,
        package_name: pkg.name,
        number_of_ushers: data.number_of_ushers,
        package_price_kes: pkg.price_kes,
        transport_rate_kes: data.transport_rate_kes,
        transport_kes: transportTotal,
        valid_until: validUntil,
        notes: data.notes,
      });
      return { pdf: r.path, signedUrl: r.signedUrl };
    })();

    const { error } = await supabaseAdmin.from("quotes").insert({
      reference, customer_name: data.customer_name, customer_email: data.customer_email,
      customer_phone: data.customer_phone ?? null, event_type: data.event_type,
      event_date: firstDate, event_dates: dates, number_of_days: days, valid_until: validUntil,
      venue: data.venue ?? null, county: data.county ?? null,
      package_slug: data.package_slug, package_name: pkg.name, number_of_ushers: data.number_of_ushers,
      package_price_kes: pkg.price_kes, transport_rate_kes: data.transport_rate_kes,
      transport_kes: transportTotal,
      subtotal_kes: subtotal, total_kes: total, notes: data.notes ?? null, pdf_path: pdf,
    });
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "quote.create", entity: "quote", diff: { reference, total } });
    return { ok: true, reference, signedUrl };
  });

export const adminGetQuoteUrl = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: q } = await supabaseAdmin.from("quotes").select("pdf_path").eq("id", data.id).maybeSingle();
    if (!q?.pdf_path) throw new Error("PDF not found");
    const { data: signed } = await supabaseAdmin.storage.from("quotes").createSignedUrl(q.pdf_path, 60 * 60);
    return { signedUrl: signed?.signedUrl ?? "" };
  });

/* ---------------- Analytics ---------------- */
export const adminAnalytics = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenOnly.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: bookings } = await supabaseAdmin.from("bookings").select("status, estimated_cost_kes, event_type, created_at, event_date");
    const all = bookings ?? [];
    const now = Date.now();
    const day = 86400000;
    const since = (d: number) => all.filter((b) => new Date(b.created_at).getTime() >= now - d * day);
    const sum = (arr: typeof all) => arr.filter((b) => b.status === "approved" || b.status === "completed").reduce((s, b) => s + (b.estimated_cost_kes ?? 0), 0);
    const byType: Record<string, number> = {};
    for (const b of all) byType[b.event_type] = (byType[b.event_type] ?? 0) + 1;
    const { data: chats } = await supabaseAdmin.from("chat_conversations").select("status");
    return {
      revenue: { today: sum(since(1)), week: sum(since(7)), month: sum(since(30)) },
      bookings: {
        total: all.length,
        pending: all.filter((b) => b.status === "pending").length,
        approved: all.filter((b) => b.status === "approved").length,
        completed: all.filter((b) => b.status === "completed").length,
        rejected: all.filter((b) => b.status === "rejected").length,
        thisWeek: since(7).length,
      },
      chats: {
        open: (chats ?? []).filter((c) => c.status === "open").length,
        closed: (chats ?? []).filter((c) => c.status !== "open").length,
      },
      popularServices: Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 6),
    };
  });

/* ---------------- Contact messages ---------------- */
export const adminListContacts = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenOnly.parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows } = await supabaseAdmin.from("contact_submissions").select("*").order("created_at", { ascending: false });
    return rows ?? [];
  });

/* ---------------- Calendar ---------------- */
export const adminCalendar = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), month: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const start = new Date(data.month + "-01");
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const { data: rows } = await supabaseAdmin.from("bookings")
      .select("id, reference, full_name, event_type, event_date, venue, county, status, number_of_ushers, estimated_cost_kes")
      .gte("event_date", start.toISOString().slice(0, 10))
      .lte("event_date", end.toISOString().slice(0, 10))
      .order("event_date");
    return rows ?? [];
  });
