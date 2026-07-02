import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, MapPin, Users, Megaphone, Package, MessageSquare, LogOut, AlertCircle, Bell, Ticket, ChevronLeft, ChevronRight, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { getSession, clearSession } from "@/lib/auth-client";
import {
  staffDashboard, listAnnouncements, markAnnouncementRead,
  listMyAssets, listMyGrievances, submitGrievance,
  staffListNotifications, staffMarkNotificationsRead,
} from "@/lib/phase3.functions";
import { staffListMyTickets, staffSubmitTicket } from "@/lib/tickets.functions";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Staff Dashboard — Smart Ushering" }] }),
  component: Page,
});

const TICKET_CATEGORIES = [
  { v: "forgot_password", l: "Forgot password" },
  { v: "account_help", l: "Account help" },
  { v: "bug_report", l: "Bug report" },
  { v: "feature_request", l: "Feature request" },
  { v: "complaint", l: "Complaint" },
  { v: "general", l: "General" },
  { v: "other", l: "Other" },
] as const;

function StaffBell({ token }: { token: string }) {
  const list = useServerFn(staffListNotifications);
  const mark = useServerFn(staffMarkNotificationsRead);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["staff-notifs", token],
    queryFn: () => list({ data: { token } }),
    refetchInterval: 60_000,
  });
  const unread = data.filter((n) => !n.read_at);
  const clearAll = async () => {
    await mark({ data: { token } });
    qc.invalidateQueries({ queryKey: ["staff-notifs"] });
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative rounded-full p-2 text-primary-foreground/90 hover:bg-white/10">
        <Bell className="h-5 w-5" />
        {unread.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-gold text-[9px] font-bold text-navy">{unread.length}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-white text-navy shadow-luxury">
            <div className="flex items-center justify-between border-b bg-cream px-3 py-2 text-xs">
              <span className="font-semibold">Notifications</span>
              {unread.length > 0 && <button onClick={clearAll} className="text-navy underline">Mark all read</button>}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {data.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">No notifications yet.</p>}
              {data.map((n) => (
                <div key={n.id} className={`border-b px-3 py-2 text-xs ${n.read_at ? "" : "bg-gold/10"}`}>
                  <div className="font-semibold">{n.title}</div>
                  {n.body && <div className="mt-0.5 text-muted-foreground">{n.body}</div>}
                  <div className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type Assignment = { id: string; status: string; is_team_leader: boolean; report_time: string | null; notes: string | null; team_leader: string | null; booking: { id: string; event_type: string; event_date: string; venue: string; county: string; status: string; number_of_ushers: number } | null };

function EventCalendar({ assignments }: { assignments: Assignment[] }) {
  const [cursor, setCursor] = useState(new Date());
  const eventDays = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      if (!a.booking?.event_date) continue;
      const key = a.booking.event_date.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [assignments]);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const offset = first.getDay();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cells: Array<{ day: number; key: string } | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= days; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, key });
  }
  return (
    <div>
      <div className="flex items-center justify-between">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="rounded p-1 hover:bg-cream"><ChevronLeft className="h-4 w-4" /></button>
        <div className="text-sm font-semibold text-navy">{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="rounded p-1 hover:bg-cream"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-muted-foreground">
        {["S","M","T","W","T","F","S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={i} />;
          const events = eventDays.get(c.key);
          const dt = new Date(year, month, c.day);
          const isToday = dt.getTime() === today.getTime();
          const isPast = dt.getTime() < today.getTime();
          return (
            <div key={i} className={`relative aspect-square rounded-md p-1 text-xs ${isToday ? "ring-2 ring-navy" : ""} ${events ? (isPast ? "bg-slate-200 text-slate-700" : "bg-gold text-gold-foreground font-bold") : "bg-cream text-muted-foreground"}`} title={events?.map((e) => `${e.booking?.event_type} @ ${e.booking?.venue}`).join("\n")}>
              <div>{c.day}</div>
              {events && <div className="absolute bottom-0.5 right-1 text-[9px]">{events.length}</div>}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-gold" /> Upcoming</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-slate-300" /> Past</span>
      </div>
    </div>
  );
}

function Page() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const dash = useServerFn(staffDashboard);
  const anns = useServerFn(listAnnouncements);
  const markRead = useServerFn(markAnnouncementRead);
  const assets = useServerFn(listMyAssets);
  const griefs = useServerFn(listMyGrievances);
  const submit = useServerFn(submitGrievance);
  const myTickets = useServerFn(staffListMyTickets);
  const submitTicket = useServerFn(staffSubmitTicket);

  useEffect(() => {
    const s = getSession();
    if (!s) { navigate({ to: "/admin/login" }); return; }
    setToken(s.token);
  }, [navigate]);

  const { data: d } = useQuery({ queryKey: ["staff-dash", token], queryFn: () => dash({ data: { token: token! } }), enabled: !!token });
  const { data: announcements = [] } = useQuery({ queryKey: ["staff-anns", token], queryFn: () => anns({ data: { token: token! } }), enabled: !!token });
  const { data: myAssets = [] } = useQuery({ queryKey: ["staff-assets", token], queryFn: () => assets({ data: { token: token! } }), enabled: !!token });
  const { data: myGriefs = [] } = useQuery({ queryKey: ["staff-griefs", token], queryFn: () => griefs({ data: { token: token! } }), enabled: !!token });
  const { data: tickets = [] } = useQuery({ queryKey: ["staff-tickets", token], queryFn: () => myTickets({ data: { token: token! } }), enabled: !!token });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", body: "", department: "", is_anonymous: false });
  const [tkOpen, setTkOpen] = useState(false);
  const [tk, setTk] = useState({ category: "forgot_password" as typeof TICKET_CATEGORIES[number]["v"], subject: "", details: "" });

  if (!token) return null;

  const upcoming = (d?.assignments ?? [])
    .filter((a) => a.booking && new Date(a.booking.event_date) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.booking!.event_date).getTime() - new Date(b.booking!.event_date).getTime());
  const next = upcoming[0];

  const todayMs = new Date(new Date().toDateString()).getTime();
  const colorFor = (a: typeof upcoming[number]) => {
    const t = new Date(a.booking!.event_date).getTime();
    if (a.status === "completed" || t < todayMs) return "bg-slate-200 text-slate-700";
    if (t === todayMs) return "bg-emerald-200 text-emerald-900";
    return "bg-gold/30 text-navy";
  };

  const onRaise = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submit({ data: { token, ...form } });
      setOpen(false);
      setForm({ subject: "", body: "", department: "", is_anonymous: false });
      qc.invalidateQueries({ queryKey: ["staff-griefs"] });
      toast.success("Concern submitted");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const onSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await submitTicket({ data: { token, ...tk, priority: tk.category === "forgot_password" ? "high" : "normal" } });
      toast.success(`Ticket ${res.ticket_no} submitted`);
      setTkOpen(false);
      setTk({ category: "forgot_password", subject: "", details: "" });
      qc.invalidateQueries({ queryKey: ["staff-tickets"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const logout = () => { clearSession(); navigate({ to: "/admin/login" }); };

  return (
    <div className="min-h-screen bg-cream pb-20">
      <header className="gradient-navy text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2">
              <img src="/icon-512.png" alt="" width={32} height={32} className="rounded" />
              <span className="font-display text-lg font-semibold text-gold">Smart Ushering</span>
            </Link>
            <div className="flex items-center gap-1">
              <StaffBell token={token} />
              <button onClick={logout} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-primary-foreground/80 hover:bg-white/10"><LogOut className="h-3.5 w-3.5" /> Logout</button>
            </div>
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold">Welcome back, {d?.me?.full_name ?? d?.me?.username ?? "Staff"}</h1>
          <div className="mt-1 text-xs text-primary-foreground/70">
            {d?.me?.staff_id && <>Staff ID: <span className="text-gold">{d.me.staff_id}</span> • </>}
            Role: <span className="capitalize">{d?.me?.role?.replace("_", " ")}</span>
            {d?.me?.department && <> • Dept: {d.me.department}</>}
            <> • Status: <span className={d?.me?.is_active ? "text-emerald-400" : "text-rose-400"}>{d?.me?.is_active ? "Active" : "Inactive"}</span></>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-md bg-gold px-3 py-2 text-xs font-semibold text-gold-foreground"><AlertCircle className="h-4 w-4" /> Raise a Concern</button>
          <button onClick={() => setTkOpen(true)} className="flex items-center gap-2 rounded-md bg-navy px-3 py-2 text-xs font-semibold text-primary-foreground"><LifeBuoy className="h-4 w-4" /> Submit Support Ticket</button>
          <a href="#calendar" className="rounded-md border bg-white px-3 py-2 text-xs">My Calendar</a>
          <a href="#tickets" className="rounded-md border bg-white px-3 py-2 text-xs">My Tickets</a>
          <a href="#schedule" className="rounded-md border bg-white px-3 py-2 text-xs">Schedule</a>
          <a href="#announcements" className="rounded-md border bg-white px-3 py-2 text-xs">Announcements</a>
          <a href="#assets" className="rounded-md border bg-white px-3 py-2 text-xs">Assets</a>
        </div>

        <section className="rounded-2xl border bg-white p-5 shadow-luxury">
          <h2 className="font-display text-lg font-semibold text-navy">Next assignment</h2>
          {next ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-2xl font-semibold text-navy">{next.booking!.event_type}</div>
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><CalendarIcon className="h-4 w-4" /> {new Date(next.booking!.event_date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}{next.report_time && <span> • Report: {new Date(next.report_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}</div>
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> {next.booking!.venue}, {next.booking!.county}</div>
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><Users className="h-4 w-4" /> Team leader: {next.team_leader ?? "TBA"}</div>
              </div>
              <div className="rounded-lg bg-cream p-4 text-sm">
                <div className="text-xs uppercase text-muted-foreground">Your role</div>
                <div className="font-semibold text-navy capitalize">{next.is_team_leader ? "Team Leader" : "Usher"}</div>
                <div className="mt-2 text-xs uppercase text-muted-foreground">Status</div>
                <div className="capitalize">{next.status}</div>
                {next.notes && <p className="mt-2 text-xs text-muted-foreground">Notes: {next.notes}</p>}
              </div>
            </div>
          ) : <p className="mt-3 text-sm text-muted-foreground">No upcoming assignments. Stay ready!</p>}
        </section>

        <section id="calendar" className="rounded-2xl border bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-navy"><CalendarIcon className="h-5 w-5 text-gold" /> My event calendar</h2>
          <EventCalendar assignments={(d?.assignments ?? []) as Assignment[]} />
        </section>

        <section id="tickets" className="rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-navy"><Ticket className="h-5 w-5 text-gold" /> My support tickets</h2>
            <button onClick={() => setTkOpen(true)} className="rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-primary-foreground">New ticket</button>
          </div>
          {tickets.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">You have no tickets. Use "New ticket" for password resets, name issues, or bug reports.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {tickets.map((t) => (
                <li key={t.id} className="py-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-muted-foreground">{t.ticket_no}</span>
                    <span className={`rounded-full px-2 py-0.5 font-semibold uppercase ${t.status === "resolved" || t.status === "closed" ? "bg-emerald-100 text-emerald-700" : t.status === "in_progress" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-700"}`}>{t.status.replace("_"," ")}</span>
                    <span className="text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-1 font-semibold text-navy">{t.subject}</div>
                  {t.admin_response && (
                    <div className="mt-2 rounded-md bg-cream p-2 text-xs">
                      <div className="font-semibold text-navy">Admin response:</div>
                      <p className="whitespace-pre-wrap text-muted-foreground">{t.admin_response}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="schedule" className="rounded-2xl border bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-navy">My schedule</h2>
          <div className="mt-3 space-y-2">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No scheduled events.</p>}
            {upcoming.map((a) => (
              <div key={a.id} className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 ${colorFor(a)}`}>
                <div>
                  <div className="text-sm font-semibold">{a.booking!.event_type}</div>
                  <div className="text-xs">{new Date(a.booking!.event_date).toLocaleDateString()} • {a.booking!.venue}</div>
                </div>
                <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] uppercase">{a.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="announcements" className="rounded-2xl border bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-navy flex items-center gap-2"><Megaphone className="h-5 w-5 text-gold" /> Announcements</h2>
          <div className="mt-3 space-y-2">
            {announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements right now.</p>}
            {announcements.map((a) => (
              <div key={a.id} className={`rounded-md border p-3 ${a.read ? "bg-white" : "bg-cream"}`}>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${a.priority === "urgent" ? "bg-rose-100 text-rose-700" : a.priority === "important" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{a.priority}</span>
                  {!a.read && <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold text-gold-foreground">NEW</span>}
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                <h3 className="mt-1 font-semibold text-navy">{a.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                {!a.read && (
                  <button onClick={async () => { await markRead({ data: { token, id: a.id } }); qc.invalidateQueries({ queryKey: ["staff-anns"] }); }} className="mt-2 text-xs font-semibold text-navy underline">Mark as read</button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section id="assets" className="rounded-2xl border bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-navy flex items-center gap-2"><Package className="h-5 w-5 text-gold" /> My assets</h2>
          {myAssets.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No assets currently assigned to you.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {myAssets.map((a) => {
                const status = (a.status ?? "assigned") as "assigned" | "returned" | "lost";
                const badge = status === "lost" ? "bg-rose-100 text-rose-700" : status === "returned" ? "bg-emerald-100 text-emerald-700" : "bg-gold/30 text-navy";
                return (
                  <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <div className="font-medium text-navy">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{a.asset_code ?? "—"} • {a.category ?? "—"} • {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : ""}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-cream px-2 py-0.5 text-xs capitalize">{a.condition}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${badge}`}>{status}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-navy flex items-center gap-2"><MessageSquare className="h-5 w-5 text-gold" /> My concerns</h2>
          {myGriefs.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">You haven't submitted any concerns yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {myGriefs.map((g) => (
                <li key={g.id} className="rounded-md border p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`rounded-full px-2 py-0.5 font-semibold uppercase ${g.status === "resolved" ? "bg-emerald-100 text-emerald-700" : g.status === "in_review" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{g.status}</span>
                    <span>{new Date(g.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-1 font-semibold text-navy">{g.subject}</div>
                  {g.admin_response && (
                    <div className="mt-2 rounded-md bg-cream p-2 text-xs">
                      <div className="font-semibold text-navy">Response from {g.responded_by ?? "admin"}:</div>
                      <p className="text-muted-foreground">{g.admin_response}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <form onSubmit={onRaise} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-navy">Raise a concern</h3>
            <input required placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
            <textarea required placeholder="Describe your concern…" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
            <input placeholder="Department (optional)" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={form.is_anonymous} onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })} />
              Submit anonymously
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border px-3 py-2 text-sm">Cancel</button>
              <button className="rounded-md bg-navy px-3 py-2 text-sm font-semibold text-primary-foreground">Submit</button>
            </div>
          </form>
        </div>
      )}

      {tkOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setTkOpen(false)}>
          <form onSubmit={onSubmitTicket} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-navy">New support ticket</h3>
            <select value={tk.category} onChange={(e) => setTk({ ...tk, category: e.target.value as typeof tk.category })} className="w-full rounded-md border px-3 py-2 text-sm">
              {TICKET_CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
            <input required maxLength={160} placeholder="Subject" value={tk.subject} onChange={(e) => setTk({ ...tk, subject: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
            <textarea maxLength={4000} rows={4} placeholder="Details (optional)" value={tk.details} onChange={(e) => setTk({ ...tk, details: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
            <p className="text-xs text-muted-foreground">Admin will reply via your dashboard and WhatsApp {d?.me && "using your registered phone"}.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setTkOpen(false)} className="rounded-md border px-3 py-2 text-sm">Cancel</button>
              <button className="rounded-md bg-navy px-3 py-2 text-sm font-semibold text-primary-foreground">Submit ticket</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
