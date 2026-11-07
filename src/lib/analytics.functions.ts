import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireRole } from "./admin.functions";

const querySchema = z.object({
  token: z.string().min(1),
  days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
  path: z.string().max(300).optional(),
});

function addCount(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

export const getVisitorAnalytics = createServerFn({ method: "POST" })
  .inputValidator((input) => querySchema.parse(input))
  .handler(async ({ data }) => {
    await requireRole(data.token, ["super_admin", "finance_reporting"]);
    const fromDate = new Date(Date.now() - data.days * 24 * 60 * 60 * 1000);
    const from = fromDate.toISOString();
    const now = new Date().toISOString();
    const [viewsResult, clickResult, heatmapResult, activeResult] = await Promise.all([
      supabaseAdmin.from("page_views").select("path, referrer, device, session_id, created_at").gte("created_at", from).order("created_at", { ascending: true }).limit(10000),
      supabaseAdmin.from("click_events").select("path, element, session_id, created_at").gte("created_at", from).order("created_at", { ascending: false }).limit(10000),
      data.path
        ? supabaseAdmin.from("heatmap_clicks").select("x_pct, y_pct").eq("path", data.path).gte("created_at", from).order("created_at", { ascending: false }).limit(1200)
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin.from("active_sessions").select("path, session_id").gte("last_seen", new Date(Date.now() - 5 * 60 * 1000).toISOString()).limit(10000),
    ]);

    const failures = [viewsResult.error, clickResult.error, heatmapResult.error, activeResult.error].filter(Boolean);
    if (failures.length) throw new Error("Visitor analytics are temporarily unavailable. Please try again.");

    const views = viewsResult.data ?? [];
    const clicks = clickResult.data ?? [];
    const active = activeResult.data ?? [];
    const uniqueVisits = new Set(views.map((row) => row.session_id));
    const pathViews = new Map<string, number>();
    const devices = new Map<string, number>();
    const referrers = new Map<string, number>();
    const daily = new Map<string, { visits: Set<string>; views: number }>();
    const funnelVisits = new Set<string>();
    const completedVisits = new Set<string>();
    const clickCategories = new Map<string, number>();
    const weekdayHours = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    const activeByPath = new Map<string, number>();

    for (const row of views) {
      addCount(pathViews, row.path);
      addCount(devices, row.device);
      addCount(referrers, row.referrer || "Direct / unknown");
      const day = row.created_at.slice(0, 10);
      const bucket = daily.get(day) ?? { visits: new Set<string>(), views: 0 };
      bucket.visits.add(row.session_id);
      bucket.views += 1;
      daily.set(day, bucket);
      if (row.path === "/book") funnelVisits.add(row.session_id);
    }

    for (const row of clicks) {
      addCount(clickCategories, row.element);
      if (row.element === "booking_success") completedVisits.add(row.session_id);
      const date = new Date(row.created_at);
      weekdayHours[date.getUTCDay()][date.getUTCHours()] += 1;
    }

    for (const row of active) addCount(activeByPath, row.path);

    const trend = Array.from({ length: data.days }, (_, index) => {
      const date = new Date(fromDate.getTime() + index * 24 * 60 * 60 * 1000);
      const day = date.toISOString().slice(0, 10);
      const bucket = daily.get(day);
      return { date: day, visits: bucket?.visits.size ?? 0, pageViews: bucket?.views ?? 0 };
    });

    const maxVisits = funnelVisits.size;
    const completed = [...completedVisits].filter((id) => funnelVisits.has(id)).length;
    const heatmapBins = new Map<string, number>();
    for (const point of heatmapResult.data ?? []) {
      const x = Math.min(9, Math.floor(Number(point.x_pct) / 10));
      const y = Math.min(9, Math.floor(Number(point.y_pct) / 10));
      addCount(heatmapBins, `${x}:${y}`);
    }
    return {
      periodDays: data.days,
      refreshedAt: now,
      totals: {
        visits: uniqueVisits.size,
        pageViews: views.length,
        activeVisitors: new Set(active.map((row) => row.session_id)).size,
        bookingViews: maxVisits,
        bookingCompletions: completed,
        bookingConversionRate: maxVisits ? Math.round((completed / maxVisits) * 1000) / 10 : 0,
      },
      truncated: views.length === 10000 || clicks.length === 10000,
      trend,
      topPages: [...pathViews.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count).slice(0, 8),
      devices: [...devices.entries()].map(([device, count]) => ({ device, count })).sort((a, b) => b.count - a.count),
      referrers: [...referrers.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count).slice(0, 8),
      activePages: [...activeByPath.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count),
      clickCategories: [...clickCategories.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
      weekdayHours,
      heatmapCells: [...heatmapBins.entries()].map(([key, count]) => {
        const [x, y] = key.split(":").map(Number);
        return { x, y, count };
      }),
    };
  });