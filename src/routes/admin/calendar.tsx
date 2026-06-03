import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminCalendar } from "@/lib/admin-phase2.functions";

export const Route = createFileRoute("/admin/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Admin" }] }),
  component: Page,
});

function Page() {
  const token = useAdminToken();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const fn = useServerFn(adminCalendar);
  const { data = [] } = useQuery({ queryKey: ["calendar", token, month], queryFn: () => fn({ data: { token: token!, month } }), enabled: !!token });
  if (!token) return null;

  const byDate = new Map<string, typeof data>();
  for (const b of data) {
    const arr = byDate.get(b.event_date) ?? [];
    arr.push(b);
    byDate.set(b.event_date, arr);
  }

  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const lastDay = new Date(y, m, 0).getDate();
  const startDow = first.getDay();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(d);

  const colorOf = (s: string) => s === "approved" ? "bg-emerald-500" : s === "completed" ? "bg-slate-500" : s === "rejected" ? "bg-rose-500" : "bg-amber-500";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-navy">Calendar</h1>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-md border px-3 py-2 text-sm" />
      </div>
      <div className="mt-6 grid grid-cols-7 gap-1 rounded-xl bg-white p-3 shadow-sm">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>)}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const dateStr = `${month}-${String(d).padStart(2, "0")}`;
          const items = byDate.get(dateStr) ?? [];
          return (
            <div key={i} className="min-h-20 rounded-md border bg-cream/30 p-1.5">
              <div className="text-xs font-semibold text-navy">{d}</div>
              <div className="mt-1 space-y-0.5">
                {items.slice(0, 3).map((b) => (
                  <div key={b.id} className={`truncate rounded px-1 py-0.5 text-[10px] text-white ${colorOf(b.status)}`} title={`${b.full_name} • ${b.event_type} • ${b.venue}`}>{b.event_type}</div>
                ))}
                {items.length > 3 && <div className="text-[10px] text-muted-foreground">+{items.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Pending</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Approved</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-500" />Completed</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Rejected</span>
      </div>
    </AdminLayout>
  );
}
