import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, Trash2, Globe2 } from "lucide-react";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { listAnnouncements, adminUpsertAnnouncement, adminDeleteAnnouncement } from "@/lib/phase3.functions";

export const Route = createFileRoute("/admin/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Admin" }] }),
  component: Page,
});

const PRIORITIES = ["urgent", "important", "normal"] as const;

// Department dropdown maps to internal audience/target_value to keep filter logic compatible.
const DEPT_OPTIONS: { label: string; audience: "all" | "role"; target_value: string }[] = [
  { label: "All Departments", audience: "all", target_value: "" },
  { label: "Super Admin", audience: "role", target_value: "super_admin" },
  { label: "Staff Management", audience: "role", target_value: "staff_management" },
  { label: "Bookings & Operations", audience: "role", target_value: "bookings_operations" },
  { label: "Customer Support", audience: "role", target_value: "customer_support" },
  { label: "Media & Content", audience: "role", target_value: "media_content" },
  { label: "Finance & Reporting", audience: "role", target_value: "finance_reporting" },
  { label: "Staff / Usher", audience: "role", target_value: "staff" },
];

function deptLabel(audience: string | null, target: string | null) {
  if (audience === "all") return "All Departments";
  const m = DEPT_OPTIONS.find((d) => d.audience === audience && d.target_value === (target ?? ""));
  return m?.label ?? `${audience}${target ? `: ${target}` : ""}`;
}

function Page() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const list = useServerFn(listAnnouncements);
  const save = useServerFn(adminUpsertAnnouncement);
  const del = useServerFn(adminDeleteAnnouncement);
  const { data = [] } = useQuery({
    queryKey: ["announcements", token],
    queryFn: () => list({ data: { token: token! } }),
    enabled: !!token,
    staleTime: 30_000,
  });

  const [form, setForm] = useState({
    title: "",
    body: "",
    priority: "normal" as "urgent" | "important" | "normal",
    deptIndex: 0,
    expires_at: "",
    is_public: false,
  });

  if (!token) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = DEPT_OPTIONS[form.deptIndex];
    try {
      await save({ data: {
        token,
        title: form.title,
        body: form.body,
        priority: form.priority,
        audience: d.audience,
        target_value: d.target_value,
        target_department: d.label,
        expires_at: form.expires_at,
        is_public: form.is_public,
      } });
      setForm({ title: "", body: "", priority: "normal", deptIndex: 0, expires_at: "", is_public: false });
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["public-announcements"] });
      toast.success("Announcement posted");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy flex items-center gap-2"><Megaphone className="h-7 w-7 text-gold" /> Announcements</h1>
      <p className="text-sm text-muted-foreground">Post internal updates to all staff, a department, or publish on the public website.</p>

      <form onSubmit={submit} className="mt-6 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2">
        <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-md border px-3 py-2 text-sm sm:col-span-2" />
        <textarea required placeholder="Message…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={3} className="rounded-md border px-3 py-2 text-sm sm:col-span-2" />
        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as typeof form.priority })} className="rounded-md border px-3 py-2 text-sm">
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={form.deptIndex} onChange={(e) => setForm({ ...form, deptIndex: Number(e.target.value) })} className="rounded-md border px-3 py-2 text-sm">
          {DEPT_OPTIONS.map((d, i) => <option key={d.label} value={i}>{d.label}</option>)}
        </select>
        <input type="datetime-local" placeholder="Expires at (optional)" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 rounded-md border bg-cream px-3 py-2 text-sm">
          <input type="checkbox" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} />
          <Globe2 className="h-4 w-4 text-gold" /> Also show on public website
        </label>
        <button className="rounded-md bg-navy py-2 text-sm font-semibold text-primary-foreground sm:col-span-2">Post announcement</button>
      </form>

      <div className="mt-6 space-y-3">
        {data.map((a) => (
          <div key={a.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${a.priority === "urgent" ? "bg-rose-100 text-rose-700" : a.priority === "important" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{a.priority}</span>
                  <span className="text-xs text-muted-foreground">{deptLabel(a.audience, a.target_value)}</span>
                  {a.is_public && <span className="inline-flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-semibold text-navy"><Globe2 className="h-3 w-3" /> PUBLIC</span>}
                  <span className="text-xs text-muted-foreground">• {new Date(a.created_at).toLocaleString()}</span>
                </div>
                <h3 className="mt-1 font-semibold text-navy">{a.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
                {a.expires_at && <p className="mt-1 text-xs text-muted-foreground">Expires: {new Date(a.expires_at).toLocaleString()}</p>}
              </div>
              <button onClick={async () => { if (confirm("Delete this announcement?")) { await del({ data: { token, id: a.id } }); qc.invalidateQueries({ queryKey: ["announcements"] }); qc.invalidateQueries({ queryKey: ["public-announcements"] }); } }} className="rounded bg-rose-100 p-1.5 text-rose-700"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">No announcements yet.</p>}
      </div>
    </AdminLayout>
  );
}
