import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Users, Megaphone, Package, MessageSquare, LogOut, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getSession, clearSession } from "@/lib/auth-client";
import {
  staffDashboard, listAnnouncements, markAnnouncementRead,
  listMyAssets, listMyGrievances, submitGrievance,
} from "@/lib/phase3.functions";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Staff Dashboard — Smart Ushering" }] }),
  component: Page,
});

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

  useEffect(() => {
    const s = getSession();
    if (!s) { navigate({ to: "/admin/login" }); return; }
    setToken(s.token);
  }, [navigate]);

  const { data: d } = useQuery({ queryKey: ["staff-dash", token], queryFn: () => dash({ data: { token: token! } }), enabled: !!token });
  const { data: announcements = [] } = useQuery({ queryKey: ["staff-anns", token], queryFn: () => anns({ data: { token: token! } }), enabled: !!token });
  const { data: myAssets = [] } = useQuery({ queryKey: ["staff-assets", token], queryFn: () => assets({ data: { token: token! } }), enabled: !!token });
  const { data: myGriefs = [] } = useQuery({ queryKey: ["staff-griefs", token], queryFn: () => griefs({ data: { token: token! } }), enabled: !!token });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", body: "", department: "", is_anonymous: false });

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

  const logout = () => { clearSession(); navigate({ to: "/admin/login" }); };

  return (
    <div className="min-h-screen bg-cream pb-20">
      {/* Welcome bar */}
      <header className="gradient-navy text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2">
              <img src="/icon-512.png" alt="" width={32} height={32} className="rounded" />
              <span className="font-display text-lg font-semibold text-gold">Smart Ushering</span>
            </Link>
            <button onClick={logout} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-primary-foreground/80 hover:bg-white/10"><LogOut className="h-3.5 w-3.5" /> Logout</button>
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
        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-md bg-gold px-3 py-2 text-xs font-semibold text-gold-foreground"><AlertCircle className="h-4 w-4" /> Raise a Concern</button>
          <a href="#schedule" className="rounded-md border bg-white px-3 py-2 text-xs">View Full Schedule</a>
          <a href="#announcements" className="rounded-md border bg-white px-3 py-2 text-xs">View Announcements</a>
          <a href="#assets" className="rounded-md border bg-white px-3 py-2 text-xs">My Assets</a>
        </div>

        {/* Upcoming event */}
        <section className="rounded-2xl border bg-white p-5 shadow-luxury">
          <h2 className="font-display text-lg font-semibold text-navy">Next assignment</h2>
          {next ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-2xl font-semibold text-navy">{next.booking!.event_type}</div>
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><Calendar className="h-4 w-4" /> {new Date(next.booking!.event_date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}{next.report_time && <span> • Report: {new Date(next.report_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}</div>
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

        {/* Schedule */}
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

        {/* Announcements */}
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

        {/* Assets */}
        <section id="assets" className="rounded-2xl border bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-navy flex items-center gap-2"><Package className="h-5 w-5 text-gold" /> My assets</h2>
          {myAssets.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No assets currently assigned to you.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {myAssets.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium text-navy">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.asset_code ?? "—"} • {a.category ?? "—"} • {a.assigned_at ? new Date(a.assigned_at).toLocaleDateString() : ""}</div>
                  </div>
                  <span className="rounded-full bg-cream px-2 py-0.5 text-xs capitalize">{a.condition}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* My concerns */}
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

      {/* Raise concern modal */}
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
    </div>
  );
}
