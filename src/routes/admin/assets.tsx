import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminListAssets, adminUpsertAsset, adminDeleteAsset } from "@/lib/phase3.functions";
import { adminListAccounts } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/assets")({
  head: () => ({ meta: [{ title: "Assets — Admin" }] }),
  component: Page,
});

const CONDITIONS = ["new", "good", "fair", "damaged", "retired"] as const;

function Page() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const list = useServerFn(adminListAssets);
  const accts = useServerFn(adminListAccounts);
  const save = useServerFn(adminUpsertAsset);
  const del = useServerFn(adminDeleteAsset);
  const { data = [] } = useQuery({ queryKey: ["assets", token], queryFn: () => list({ data: { token: token! } }), enabled: !!token });
  const { data: accounts = [] } = useQuery({ queryKey: ["accounts-for-assets", token], queryFn: () => accts({ data: { token: token! } }), enabled: !!token });
  const [form, setForm] = useState({
    name: "", asset_code: "", category: "", condition: "good" as typeof CONDITIONS[number],
    assigned_to: "" as string, notes: "",
  });
  if (!token) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save({ data: { token, ...form, assigned_to: form.assigned_to || null } });
      setForm({ name: "", asset_code: "", category: "", condition: "good", assigned_to: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["assets"] });
      toast.success("Asset saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const personName = (id: string | null) => accounts.find((a) => a.id === id)?.full_name ?? "—";

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Assets</h1>
      <p className="text-sm text-muted-foreground">Track inventory and what's assigned to each staff member.</p>

      <form onSubmit={submit} className="mt-6 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-3">
        <input required placeholder="Asset name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <input placeholder="Asset code" value={form.asset_code} onChange={(e) => setForm({ ...form, asset_code: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value as typeof CONDITIONS[number] })} className="rounded-md border px-3 py-2 text-sm">
          {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className="rounded-md border px-3 py-2 text-sm">
          <option value="">Unassigned</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.full_name ?? a.username}</option>)}
        </select>
        <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <button className="rounded-md bg-navy py-2 text-sm font-semibold text-primary-foreground sm:col-span-3">Add asset</button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase text-muted-foreground"><tr>{["Name","Code","Category","Condition","Assigned to","Notes",""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.asset_code ?? "—"}</td>
                <td className="px-4 py-3">{a.category ?? "—"}</td>
                <td className="px-4 py-3 capitalize">{a.condition}</td>
                <td className="px-4 py-3">{personName(a.assigned_to)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{a.notes ?? "—"}</td>
                <td className="px-4 py-3"><button onClick={async () => { if (confirm("Delete asset?")) { await del({ data: { token, id: a.id } }); qc.invalidateQueries({ queryKey: ["assets"] }); } }} className="rounded bg-rose-100 p-1.5 text-rose-700"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No assets yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
