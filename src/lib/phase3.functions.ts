import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAudit } from "./audit.server";

async function requireSession(token: string) {
  if (!token) throw new Error("Unauthorized");
  const { data } = await supabaseAdmin
    .from("admin_users")
    .select("id, username, full_name, role, department, is_super_admin, is_active, session_expires_at, staff_id")
    .eq("session_token", token)
    .maybeSingle();
  if (!data || !data.is_active) throw new Error("Unauthorized");
  if (data.session_expires_at && new Date(data.session_expires_at) < new Date()) throw new Error("Session expired");
  return data;
}

/* ---------------- Announcements ---------------- */
export const listAnnouncements = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireSession(data.token);
    const nowIso = new Date().toISOString();
    const { data: rows } = await supabaseAdmin
      .from("announcements")
      .select("*")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });
    const visible = (rows ?? []).filter((a) => {
      if (a.audience === "all") return true;
      if (a.audience === "department") return (me.department ?? "") === (a.target_value ?? "");
      if (a.audience === "role") return me.role === a.target_value;
      return false;
    });
    const { data: reads } = await supabaseAdmin
      .from("announcement_reads")
      .select("announcement_id")
      .eq("user_id", me.id);
    const readSet = new Set((reads ?? []).map((r) => r.announcement_id));
    const order = { urgent: 0, important: 1, normal: 2 } as Record<string, number>;
    return visible
      .map((a) => ({ ...a, read: readSet.has(a.id) }))
      .sort((x, y) => (order[x.priority] - order[y.priority]) || (new Date(y.created_at).getTime() - new Date(x.created_at).getTime()));
  });

export const markAnnouncementRead = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireSession(data.token);
    await supabaseAdmin.from("announcement_reads")
      .upsert({ user_id: me.id, announcement_id: data.id }, { onConflict: "announcement_id,user_id" });
    return { ok: true };
  });

export const adminUpsertAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(4000),
    priority: z.enum(["urgent","important","normal"]).default("normal"),
    audience: z.enum(["all","department","role"]).default("all"),
    target_value: z.string().max(80).optional().or(z.literal("")),
    expires_at: z.string().optional().or(z.literal("")),
    is_public: z.boolean().default(false),
    target_department: z.string().max(80).optional().or(z.literal("")),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireSession(data.token);
    const payload = {
      title: data.title, body: data.body, priority: data.priority,
      audience: data.audience, target_value: data.target_value || null,
      expires_at: data.expires_at || null, created_by: me.id,
      is_public: data.is_public,
      target_department: data.target_department || null,
    };
    const q = data.id
      ? supabaseAdmin.from("announcements").update(payload).eq("id", data.id)
      : supabaseAdmin.from("announcements").insert(payload);
    const { error } = await q;
    if (error) throw new Error(error.message);
    await logAudit({ actor: me.username, action: data.id ? "announcement.update" : "announcement.create", entity: "announcement", entity_id: data.id ?? null, diff: payload });
    return { ok: true };
  });

/* Public (anonymous) — non-expired public announcements */
export const listPublicAnnouncements = createServerFn({ method: "GET" })
  .handler(async () => {
    const nowIso = new Date().toISOString();
    const { data: rows } = await supabaseAdmin
      .from("announcements")
      .select("id, title, body, priority, created_at, expires_at")
      .eq("is_public", true)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("created_at", { ascending: false })
      .limit(10);
    return rows ?? [];
  });

export const adminDeleteAnnouncement = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireSession(data.token);
    await supabaseAdmin.from("announcements").delete().eq("id", data.id);
    await logAudit({ actor: me.username, action: "announcement.delete", entity: "announcement", entity_id: data.id });
    return { ok: true };
  });

/* ---------------- Grievances ---------------- */
export const submitGrievance = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string().optional(),
    subject: z.string().min(3).max(200),
    body: z.string().min(5).max(4000),
    department: z.string().max(80).optional().or(z.literal("")),
    is_anonymous: z.boolean().default(false),
    public_name: z.string().max(120).optional(), // for public submitters
  }).parse(d))
  .handler(async ({ data }) => {
    let submitted_by: string | null = null;
    let submitted_by_name: string | null = data.public_name ?? null;
    if (data.token) {
      try {
        const me = await requireSession(data.token);
        submitted_by = me.id;
        submitted_by_name = me.full_name ?? me.username;
      } catch { /* fall through public */ }
    }
    const { error } = await supabaseAdmin.from("grievances").insert({
      subject: data.subject, body: data.body,
      department: data.department || null,
      is_anonymous: data.is_anonymous,
      submitted_by, submitted_by_name,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyGrievances = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireSession(data.token);
    const { data: rows } = await supabaseAdmin
      .from("grievances").select("*").eq("submitted_by", me.id).order("created_at", { ascending: false });
    return rows ?? [];
  });

export const adminListGrievances = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireSession(data.token);
    const { data: rows } = await supabaseAdmin
      .from("grievances").select("*").order("created_at", { ascending: false });
    return rows ?? [];
  });

export const adminRespondGrievance = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(), id: z.string().uuid(),
    status: z.enum(["pending","in_review","resolved"]).optional(),
    admin_response: z.string().max(4000).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireSession(data.token);
    const upd: { status?: "pending" | "in_review" | "resolved"; admin_response?: string; responded_by?: string; responded_at?: string } = {};
    if (data.status) upd.status = data.status;
    if (data.admin_response !== undefined) {
      upd.admin_response = data.admin_response;
      upd.responded_by = me.full_name ?? me.username;
      upd.responded_at = new Date().toISOString();
    }
    const { error } = await supabaseAdmin.from("grievances").update(upd).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: me.username, action: "grievance.respond", entity: "grievance", entity_id: data.id, diff: upd });
    return { ok: true };
  });

/* ---------------- Assets ---------------- */
export const adminListAssets = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireSession(data.token);
    const { data: rows } = await supabaseAdmin.from("assets").select("*").order("created_at", { ascending: false });
    return rows ?? [];
  });

export const listMyAssets = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireSession(data.token);
    const { data: rows } = await supabaseAdmin.from("assets").select("*").eq("assigned_to", me.id).order("assigned_at", { ascending: false });
    return rows ?? [];
  });

export const adminUpsertAsset = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(200),
    asset_code: z.string().max(80).optional().or(z.literal("")),
    category: z.string().max(80).optional().or(z.literal("")),
    condition: z.enum(["new","good","fair","damaged","retired"]).default("good"),
    status: z.enum(["assigned","returned","lost"]).default("assigned"),
    assigned_to: z.string().uuid().nullable().optional(),
    notes: z.string().max(500).optional().or(z.literal("")),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireSession(data.token);
    const payload = {
      name: data.name, asset_code: data.asset_code || null,
      category: data.category || null, condition: data.condition,
      status: data.status,
      assigned_to: data.assigned_to || null,
      assigned_at: data.assigned_to ? new Date().toISOString() : null,
      notes: data.notes || null,
    };
    const q = data.id
      ? supabaseAdmin.from("assets").update(payload).eq("id", data.id)
      : supabaseAdmin.from("assets").insert(payload);
    const { error } = await q;
    if (error) throw new Error(error.message);
    await logAudit({ actor: me.username, action: data.id ? "asset.update" : "asset.create", entity: "asset", entity_id: data.id ?? null, diff: payload });
    return { ok: true };
  });

export const adminSetAssetStatus = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    id: z.string().uuid(),
    status: z.enum(["assigned","returned","lost"]),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireSession(data.token);
    const { error } = await supabaseAdmin.from("assets").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: me.username, action: "asset.status", entity: "asset", entity_id: data.id, diff: { status: data.status } });
    return { ok: true };
  });

export const adminDeleteAsset = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireSession(data.token);
    await supabaseAdmin.from("assets").delete().eq("id", data.id);
    await logAudit({ actor: me.username, action: "asset.delete", entity: "asset", entity_id: data.id });
    return { ok: true };
  });

/* ---------------- Staff dashboard ---------------- */
export const staffDashboard = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireSession(data.token);
    // Match staff record by phone or name (legacy staff table). Also support new RBAC where admin_users.id is the identity.
    const { data: staffRow } = await supabaseAdmin
      .from("staff").select("id").eq("full_name", me.full_name ?? "").maybeSingle();
    const staffId = staffRow?.id;

    const assignments = staffId
      ? (await supabaseAdmin.from("booking_assignments")
          .select("*, booking:booking_id(id, reference, full_name, event_type, event_date, venue, county, status, number_of_ushers)")
          .eq("staff_id", staffId)
          .order("created_at", { ascending: false })).data ?? []
      : [];

    // Team leaders per booking
    const bookingIds = assignments.map((a) => a.booking_id);
    const leaders = bookingIds.length
      ? (await supabaseAdmin.from("booking_assignments")
          .select("booking_id, is_team_leader, staff:staff_id(full_name)")
          .in("booking_id", bookingIds).eq("is_team_leader", true)).data ?? []
      : [];
    const leaderMap = new Map<string, string>();
    for (const l of leaders) {
      const s = l.staff as { full_name?: string } | { full_name?: string }[] | null;
      const name = Array.isArray(s) ? s[0]?.full_name : s?.full_name;
      if (name) leaderMap.set(l.booking_id, name);
    }
    const withLeaders = assignments.map((a) => ({ ...a, team_leader: leaderMap.get(a.booking_id) ?? null }));

    return {
      me: {
        id: me.id, username: me.username, full_name: me.full_name,
        role: me.role, department: me.department, staff_id: me.staff_id, is_active: me.is_active,
      },
      assignments: withLeaders,
    };
  });

/* ---------------- Booking permanent delete ---------------- */
export const adminDeleteBooking = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireSession(data.token);
    await supabaseAdmin.from("booking_assignments").delete().eq("booking_id", data.id);
    const { error } = await supabaseAdmin.from("bookings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actor: me.username, action: "booking.delete", entity: "booking", entity_id: data.id });
    return { ok: true };
  });

/* ---------------- Client event tracking ---------------- */
export const clientTrackBooking = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    reference: z.string().min(3).max(40),
    phone_last4: z.string().min(4).max(4).regex(/^\d{4}$/),
  }).parse(d))
  .handler(async ({ data }) => {
    const { data: b } = await supabaseAdmin
      .from("bookings")
      .select("reference, full_name, event_type, event_date, venue, county, status, number_of_ushers, package_price_kes, estimated_cost_kes, phone, created_at")
      .eq("reference", data.reference.toUpperCase())
      .maybeSingle();
    if (!b) throw new Error("Booking not found");
    const last4 = (b.phone ?? "").replace(/\D/g, "").slice(-4);
    if (last4 !== data.phone_last4) throw new Error("Verification failed");
    // strip phone before returning
    const { phone: _phone, ...safe } = b;
    void _phone;
    return safe;
  });
