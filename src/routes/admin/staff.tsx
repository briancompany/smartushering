import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminListStaff, adminUpsertStaff, adminDeleteStaff } from "@/lib/admin-phase2.functions";

export const Route = createFileRoute("/admin/staff")({
  head: () => ({ meta: [{ title: "Staff — Admin" }] }),
  component: Page,
});

function Page() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const list = useServerFn(adminListStaff);
  const upsert = useServerFn(adminUpsertStaff);
  const del = useServerFn(adminDeleteStaff);
  const { data = [] } = useQuery({ queryKey: ["staff", token], queryFn: () => list({ data: { token: token! } }), enabled: !!token });
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", role: "usher" as "usher" | "team_leader" | "coordinator" });
  if (!token) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await upsert({ data: { token, ...form, is_active: true } });
      setForm({ full_name: "", phone: "", email: "", role: "usher" });
      toast.success("Staff added");
      qc.invalidateQueries({ queryKey: ["staff"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this staff member?")) return;
    try { await del({ data: { token, id } }); qc.invalidateQueries({ queryKey: ["staff"] }); toast.success("Deleted"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Staff roster</h1>

      <form onSubmit={submit} className="mt-6 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-5">
        <input required placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded-md border px-3 py-2 text-sm sm:col-span-1" />
        <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <input type="email" placeholder="Email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "usher" | "team_leader" | "coordinator" })} className="rounded-md border px-3 py-2 text-sm">
          <option value="usher">Usher</option><option value="team_leader">Team leader</option><option value="coordinator">Coordinator</option>
        </select>
        <button className="rounded-md bg-navy py-2 text-sm font-semibold text-primary-foreground">Add staff</button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase text-muted-foreground"><tr>{["Name","Phone","Email","Role","Status",""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {data.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-3 font-medium">{s.full_name}</td>
                <td className="px-4 py-3">{s.phone}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.email ?? "—"}</td>
                <td className="px-4 py-3 capitalize">{s.role.replace("_"," ")}</td>
                <td className="px-4 py-3">{s.is_active ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Active</span> : <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs">Inactive</span>}</td>
                <td className="px-4 py-3"><button onClick={() => remove(s.id)} className="text-xs text-rose-600">Delete</button></td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No staff added yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
