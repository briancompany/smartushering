import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminGetDashboard } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Smart Ushering" }] }),
  component: Page,
});

function Page() {
  const token = useAdminToken();
  const fn = useServerFn(adminGetDashboard);
  const { data } = useQuery({ queryKey: ["admin-dash", token], queryFn: () => fn({ data: { token: token! } }), enabled: !!token });
  if (!token) return null;

  const cards = data ? [
    { label: "Total Bookings", value: data.stats.total, Icon: Calendar, color: "bg-navy text-primary-foreground" },
    { label: "Pending", value: data.stats.pending, Icon: Clock, color: "bg-gold text-gold-foreground" },
    { label: "Approved", value: data.stats.approved, Icon: CheckCircle2, color: "bg-emerald-600 text-white" },
    { label: "Rejected", value: data.stats.rejected, Icon: XCircle, color: "bg-rose-600 text-white" },
    { label: "Active Chats", value: data.stats.activeChats, Icon: MessageSquare, color: "bg-slate-700 text-white" },
  ] : [];

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Dashboard</h1>
      <p className="text-sm text-muted-foreground">Overview of bookings and activity.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-white p-5">
            <div className={`grid h-10 w-10 place-items-center rounded-md ${c.color}`}><c.Icon className="h-5 w-5" /></div>
            <div className="mt-3 text-2xl font-bold text-navy">{c.value}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-display text-xl font-semibold text-navy">Recent Bookings</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>{["Ref","Name","Event","Date","Ushers","Cost","Status"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data?.recentBookings.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-4 py-3 font-mono text-xs">{b.reference}</td>
                <td className="px-4 py-3">{b.full_name}</td>
                <td className="px-4 py-3">{b.event_type}</td>
                <td className="px-4 py-3">{b.event_date}</td>
                <td className="px-4 py-3">{b.number_of_ushers}</td>
                <td className="px-4 py-3">KES {b.estimated_cost_kes.toLocaleString()}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-cream px-2 py-1 text-xs">{b.status}</span></td>
              </tr>
            ))}
            {data && data.recentBookings.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No bookings yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
