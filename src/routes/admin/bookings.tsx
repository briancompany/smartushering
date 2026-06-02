import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminListBookings, adminUpdateBooking } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/bookings")({
  head: () => ({ meta: [{ title: "Bookings — Admin" }] }),
  component: Page,
});

function Page() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const list = useServerFn(adminListBookings);
  const update = useServerFn(adminUpdateBooking);
  const { data } = useQuery({ queryKey: ["admin-bookings", token], queryFn: () => list({ data: { token: token! } }), enabled: !!token });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  if (!token) return null;

  const rows = (data ?? []).filter((b) => {
    if (filter !== "all" && b.status !== filter) return false;
    if (search && !`${b.full_name} ${b.reference} ${b.email} ${b.phone}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const doUpdate = async (id: string, status: "pending" | "approved" | "rejected" | "completed") => {
    try {
      await update({ data: { token, id, status } });
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Bookings</h1>
      <div className="mt-4 flex flex-wrap gap-3">
        <input placeholder="Search name, ref, email..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 rounded-md border px-3 py-2 text-sm" />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
          {["all","pending","approved","rejected","completed"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase text-muted-foreground"><tr>{["Ref","Customer","Event","Date","Ushers","Cost","Status","Actions"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t align-top">
                <td className="px-4 py-3 font-mono text-xs">{b.reference}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{b.full_name}</div>
                  <div className="text-xs text-muted-foreground">{b.phone}</div>
                  <div className="text-xs text-muted-foreground">{b.email}</div>
                </td>
                <td className="px-4 py-3">{b.event_type}<div className="text-xs text-muted-foreground">{b.venue}, {b.county}</div></td>
                <td className="px-4 py-3">{b.event_date}</td>
                <td className="px-4 py-3">{b.number_of_ushers}</td>
                <td className="px-4 py-3">KES {b.estimated_cost_kes.toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${b.status === "approved" ? "bg-emerald-100 text-emerald-700" : b.status === "rejected" ? "bg-rose-100 text-rose-700" : b.status === "completed" ? "bg-slate-200" : "bg-amber-100 text-amber-800"}`}>{b.status}</span></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => doUpdate(b.id, "approved")} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white">Approve</button>
                    <button onClick={() => doUpdate(b.id, "rejected")} className="rounded bg-rose-600 px-2 py-1 text-xs text-white">Reject</button>
                    <button onClick={() => doUpdate(b.id, "completed")} className="rounded bg-slate-700 px-2 py-1 text-xs text-white">Complete</button>
                    <a href={`tel:${b.phone}`} className="rounded border px-2 py-1 text-xs">Call</a>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No bookings.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
