import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminAnalytics } from "@/lib/admin-phase2.functions";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }] }),
  component: Page,
});

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl font-bold text-navy">{value}</div>
    </div>
  );
}

function Page() {
  const token = useAdminToken();
  const fn = useServerFn(adminAnalytics);
  const { data } = useQuery({ queryKey: ["analytics", token], queryFn: () => fn({ data: { token: token! } }), enabled: !!token });
  if (!token || !data) return <AdminLayout><p>Loading…</p></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Analytics</h1>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Revenue</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <Stat label="Today" value={`KES ${data.revenue.today.toLocaleString()}`} />
        <Stat label="This week" value={`KES ${data.revenue.week.toLocaleString()}`} />
        <Stat label="This month" value={`KES ${data.revenue.month.toLocaleString()}`} />
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Bookings</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total" value={data.bookings.total} />
        <Stat label="Pending" value={data.bookings.pending} />
        <Stat label="Approved" value={data.bookings.approved} />
        <Stat label="Completed" value={data.bookings.completed} />
        <Stat label="Rejected" value={data.bookings.rejected} />
        <Stat label="This week" value={data.bookings.thisWeek} />
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Chats</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Stat label="Active chats" value={data.chats.open} />
        <Stat label="Closed chats" value={data.chats.closed} />
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Popular event types</h2>
      <div className="mt-3 rounded-xl border bg-white p-5">
        {data.popularServices.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : (
          <ul className="space-y-2">
            {data.popularServices.map(([name, count]) => (
              <li key={name} className="flex items-center justify-between">
                <span className="text-sm text-navy">{name}</span>
                <span className="font-semibold text-navy">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
