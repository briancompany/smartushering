import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ArrowDownRight, MousePointer2, RefreshCw, Users, Eye, MousePointerClick } from "lucide-react";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { getVisitorAnalytics } from "@/lib/analytics.functions";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [
    { title: "Visitor Analytics — Admin — Smart Ushering" },
    { name: "description", content: "Private visitor, booking funnel, and page interaction analytics for Smart Ushering." },
    { property: "og:title", content: "Visitor Analytics — Admin — Smart Ushering" },
    { property: "og:description", content: "Private visitor, booking funnel, and page interaction analytics for Smart Ushering." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

const DAY_OPTIONS = [7, 30, 90] as const;
const DEVICE_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Stat({ label, value, detail, Icon }: { label: string; value: string | number; detail: string; Icon: typeof Eye }) {
  return (
    <div className="min-w-0 border-l-2 border-gold bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        <Icon className="h-4 w-4 shrink-0 text-gold" />
      </div>
      <div className="mt-2 font-display text-2xl font-bold tabular-nums text-navy sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}

function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <h2 className="font-display text-xl font-semibold text-navy">{title}</h2>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

function Page() {
  const token = useAdminToken();
  const getAnalytics = useServerFn(getVisitorAnalytics);
  const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>(30);
  const [selectedPath, setSelectedPath] = useState("/");
  const query = useQuery({
    queryKey: ["visitor-analytics", token, days, selectedPath],
    queryFn: () => {
      if (!token) throw new Error("Sign in to view analytics.");
      return getAnalytics({ data: { token, days, path: selectedPath } });
    },
    enabled: !!token,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (!token) return <AdminLayout><p className="text-sm text-muted-foreground">Loading analytics…</p></AdminLayout>;
  if (query.isPending) return <AdminLayout><p className="text-sm text-muted-foreground">Loading visitor analytics…</p></AdminLayout>;
  if (query.isError) return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Analytics</h1>
      <div className="mt-5 border-l-2 border-destructive bg-white p-4 text-sm text-destructive">
        Visitor analytics could not be loaded. <Button variant="outline" size="sm" className="ml-2" onClick={() => void query.refetch()}>Try again</Button>
      </div>
    </AdminLayout>
  );

  const data = query.data;
  const totalDevices = data.devices.reduce((sum, item) => sum + item.count, 0);
  const maxPageViews = Math.max(1, ...data.topPages.map((item) => item.count));
  const maxClicks = Math.max(1, ...data.clickCategories.map((item) => item.count));
  const maxHeat = Math.max(1, ...data.heatmapCells.map((item) => item.count));
  const selectedPathViews = data.topPages.find((item) => item.path === selectedPath)?.count ?? 0;

  return (
    <AdminLayout>
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <Activity className="h-4 w-4 text-gold" /> Visitor insights
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold text-navy">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Public-site visits and page interactions, updated every minute.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border bg-white p-1" aria-label="Analytics date range">
            {DAY_OPTIONS.map((option) => (
              <Button key={option} type="button" size="sm" variant={days === option ? "default" : "ghost"} onClick={() => setDays(option)}>
                {option} days
              </Button>
            ))}
          </div>
          <Button type="button" variant="outline" size="icon" aria-label="Refresh analytics" title="Refresh analytics" onClick={() => void query.refetch()}>
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {data.truncated && <p className="mt-4 border-l-2 border-gold bg-white px-3 py-2 text-xs text-muted-foreground">This view reached the available row limit. Use a shorter date range for exact totals.</p>}

      <section className="mt-6 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Visits" value={data.totals.visits.toLocaleString()} detail={`Unique visits in ${days} days`} Icon={Users} />
        <Stat label="Page views" value={data.totals.pageViews.toLocaleString()} detail="Public pages viewed" Icon={Eye} />
        <Stat label="Visitors now" value={data.totals.activeVisitors.toLocaleString()} detail="Active in the last 5 minutes" Icon={Activity} />
        <Stat label="Booking conversion" value={`${data.totals.bookingConversionRate}%`} detail={`${data.totals.bookingCompletions} completions from ${data.totals.bookingViews} booking-page visits`} Icon={ArrowDownRight} />
      </section>

      <section className="mt-8 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <div className="min-w-0 border-t-2 border-navy bg-white p-4 sm:p-5">
          <SectionTitle title="Visits over time" detail="By day" />
          {data.trend.some((item) => item.visits > 0) ? (
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend} margin={{ top: 8, right: 12, left: -20, bottom: 2 }}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 6, borderColor: "var(--color-border)" }} />
                  <Line type="monotone" dataKey="visits" name="Visits" stroke="var(--color-chart-1)" strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="pageViews" name="Page views" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty>No visitor records yet for this period.</Empty>}
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-chart-1" />Visits</span>
            <span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-chart-2" />Page views</span>
          </div>
        </div>

        <div className="min-w-0 border-t-2 border-gold bg-white p-4 sm:p-5">
          <SectionTitle title="Devices" detail="Visits by device" />
          {totalDevices ? (
            <>
              <div className="h-48 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.devices} dataKey="count" nameKey="device" innerRadius={52} outerRadius={78} paddingAngle={3}>
                      {data.devices.map((item, index) => <Cell key={item.device} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {data.devices.map((item, index) => (
                  <div key={item.device} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 capitalize"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: DEVICE_COLORS[index % DEVICE_COLORS.length] }} />{item.device}</span>
                    <span className="font-semibold tabular-nums">{item.count.toLocaleString()} <span className="font-normal text-muted-foreground">({Math.round((item.count / totalDevices) * 100)}%)</span></span>
                  </div>
                ))}
              </div>
            </>
          ) : <Empty>No device data yet.</Empty>}
        </div>
      </section>

      <section className="mt-8 grid min-w-0 gap-6 lg:grid-cols-2">
        <div className="min-w-0 border-t-2 border-navy bg-white p-4 sm:p-5">
          <SectionTitle title="Most viewed pages" detail="Public pages only" />
          {data.topPages.length ? <div className="space-y-3">
            {data.topPages.map((item) => (
              <div key={item.path} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
                <span className="truncate text-navy" title={item.path}>{item.path}</span>
                <span className="font-semibold tabular-nums">{item.count.toLocaleString()}</span>
                <div className="col-span-2 h-1.5 overflow-hidden rounded-sm bg-muted"><div className="h-full bg-chart-1" style={{ width: `${(item.count / maxPageViews) * 100}%` }} /></div>
              </div>
            ))}
          </div> : <Empty>No page views yet.</Empty>}
        </div>

        <div className="min-w-0 border-t-2 border-gold bg-white p-4 sm:p-5">
          <SectionTitle title="Visit sources" detail="Referring sites" />
          {data.referrers.length ? <div className="space-y-3">
            {data.referrers.map((item) => (
              <div key={item.source} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
                <span className="truncate" title={item.source}>{item.source}</span>
                <span className="font-semibold tabular-nums">{item.count.toLocaleString()}</span>
                <div className="col-span-2 h-1.5 overflow-hidden rounded-sm bg-muted"><div className="h-full bg-chart-2" style={{ width: `${(item.count / Math.max(1, data.referrers[0]?.count ?? 1)) * 100}%` }} /></div>
              </div>
            ))}
          </div> : <Empty>No source data yet.</Empty>}
        </div>
      </section>

      <section className="mt-8 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="min-w-0 border-t-2 border-navy bg-white p-4 sm:p-5">
          <SectionTitle title="Booking funnel" detail="Visits that reached /book" />
          <div className="space-y-4">
            <FunnelRow label="Booking page visits" count={data.totals.bookingViews} max={data.totals.bookingViews} />
            <FunnelRow label="Booking confirmations" count={data.totals.bookingCompletions} max={data.totals.bookingViews} />
            <div className="border-t pt-3 text-sm text-muted-foreground">Conversion from booking-page visit: <span className="font-semibold text-navy">{data.totals.bookingConversionRate}%</span></div>
          </div>
        </div>

        <div className="min-w-0 border-t-2 border-gold bg-white p-4 sm:p-5">
          <SectionTitle title="Click activity" detail="Generic interaction types only" />
          {data.clickCategories.length ? <div className="space-y-3">
            {data.clickCategories.map((item) => (
              <div key={item.category} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
                <span className="flex min-w-0 items-center gap-2 capitalize"><MousePointerClick className="h-4 w-4 shrink-0 text-gold" /><span className="truncate">{item.category.replaceAll("_", " ")}</span></span>
                <span className="font-semibold tabular-nums">{item.count.toLocaleString()}</span>
                <div className="col-span-2 h-1.5 overflow-hidden rounded-sm bg-muted"><div className="h-full bg-chart-1" style={{ width: `${(item.count / maxClicks) * 100}%` }} /></div>
              </div>
            ))}
          </div> : <Empty>No clicks yet.</Empty>}
        </div>
      </section>

      <section className="mt-8 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <div className="min-w-0 border-t-2 border-navy bg-white p-4 sm:p-5">
          <SectionTitle title="Currently active" detail="Seen in the last five minutes" />
          {data.activePages.length ? <div className="space-y-2">
            {data.activePages.map((item) => <div key={item.path} className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0"><span className="truncate text-navy" title={item.path}>{item.path}</span><span className="flex shrink-0 items-center gap-1.5 font-semibold"><i className="h-2 w-2 rounded-full bg-chart-3" />{item.count}</span></div>)}
          </div> : <Empty>No active visitors right now.</Empty>}
        </div>

        <div className="min-w-0 border-t-2 border-gold bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><SectionTitle title="Page click map" detail={`${selectedPathViews.toLocaleString()} page views in this period`} /></div>
            <label className="min-w-0 text-xs text-muted-foreground">
              <span className="sr-only">Choose page for click map</span>
              <select className="max-w-full rounded-md border bg-background px-2 py-1.5 text-foreground" value={selectedPath} onChange={(event) => setSelectedPath(event.target.value)}>
                {[...new Set(["/", ...data.topPages.map((item) => item.path)])].map((path) => <option key={path} value={path}>{path}</option>)}
              </select>
            </label>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Click locations are grouped into a privacy-safe 10 × 10 grid.</p>
          <div className="grid aspect-[5/3] min-h-40 grid-cols-10 grid-rows-10 gap-1 border bg-muted/40 p-2 sm:gap-1.5" role="img" aria-label={`Click activity map for ${selectedPath}`}>
            {Array.from({ length: 100 }, (_, index) => {
              const x = index % 10;
              const y = Math.floor(index / 10);
              const cell = data.heatmapCells.find((item) => item.x === x && item.y === y);
              const intensity = cell ? Math.min(4, Math.ceil((cell.count / maxHeat) * 4)) : 0;
              const color = ["bg-background", "bg-chart-1/20", "bg-chart-1/40", "bg-chart-1/65", "bg-chart-1"][intensity];
              return <div key={index} className={`min-h-0 min-w-0 rounded-[2px] ${color}`} title={cell ? `${cell.count} clicks` : "No clicks"} />;
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground"><span>Few clicks</span><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 bg-chart-1/20" /><i className="h-2.5 w-2.5 bg-chart-1/40" /><i className="h-2.5 w-2.5 bg-chart-1/65" /><i className="h-2.5 w-2.5 bg-chart-1" /></span><span>More clicks</span></div>
          {data.heatmapCells.length === 0 && <p className="mt-3 text-xs text-muted-foreground">No click locations recorded for this page yet.</p>}
        </div>
      </section>

      <section className="mt-8 min-w-0 border-t-2 border-navy bg-white p-4 sm:p-5">
        <SectionTitle title="Busy times" detail="Click activity by Kenya time (EAT)" />
        <div className="grid grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-1 overflow-x-auto pb-2 text-[9px] text-muted-foreground sm:gap-1.5">
          <span />
          {Array.from({ length: 24 }, (_, hour) => <span key={hour} className="text-center">{hour % 3 === 0 ? `${String(hour).padStart(2, "0")}` : ""}</span>)}
          {WEEKDAYS.map((day, weekday) => (
            <div key={day} className="contents">
              <span className="flex items-center">{day}</span>
              {Array.from({ length: 24 }, (_, hour) => {
                const localHour = (hour - 3 + 24) % 24;
                const count = data.weekdayHours[weekday]?.[localHour] ?? 0;
                const intensity = count ? Math.min(4, Math.ceil((count / Math.max(1, ...data.weekdayHours.flat())) * 4)) : 0;
                const color = ["bg-muted", "bg-chart-2/20", "bg-chart-2/40", "bg-chart-2/65", "bg-chart-2"][intensity];
                return <span key={`${day}-${hour}`} className={`aspect-square min-w-2 rounded-[2px] ${color}`} title={`${day}, ${String(hour).padStart(2, "0")}:00 EAT — ${count} clicks`} />;
              })}
            </div>
          ))}
        </div>
      </section>

      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><MousePointer2 className="h-3.5 w-3.5" />Names, form values, and typed content are not recorded.</p>
    </AdminLayout>
  );
}

function FunnelRow({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-3 text-sm"><span>{label}</span><span className="font-semibold tabular-nums">{count.toLocaleString()}</span></div>
      <div className="h-3 overflow-hidden rounded-sm bg-muted"><div className="h-full bg-chart-1" style={{ width: `${max ? Math.max((count / max) * 100, count ? 2 : 0) : 0}%` }} /></div>
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <div className="flex min-h-24 items-center justify-center text-center text-sm text-muted-foreground">{children}</div>;
}