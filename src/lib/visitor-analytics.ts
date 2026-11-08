import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "smart-ushering-analytics-session";
const SESSION_TTL = 30 * 60 * 1000;
const PRIVATE_PREFIXES = ["/admin", "/staff", "/auth"];

type VisitState = { id: string; expiresAt: number; lastPath: string | null };

function safePath(path: string): string | null {
  if (!path.startsWith("/") || path.length > 300 || !/^\/[a-zA-Z0-9/_-]*$/.test(path)) return null;
  if (PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return null;
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
}

function visitState(): VisitState | null {
  if (typeof window === "undefined") return null;
  const now = Date.now();
  let saved: VisitState | null = null;
  try {
    const value = window.sessionStorage.getItem(SESSION_KEY);
    saved = value ? (JSON.parse(value) as VisitState) : null;
  } catch {
    saved = null;
  }
  if (!saved || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved.id) || typeof saved.expiresAt !== "number" || saved.expiresAt <= now) {
    saved = { id: window.crypto.randomUUID(), expiresAt: now + SESSION_TTL, lastPath: null };
  }
  saved.expiresAt = now + SESSION_TTL;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(saved));
  } catch {
    // Tracking is optional when browser storage is unavailable.
  }
  return saved;
}

function deviceClass(): "mobile" | "tablet" | "desktop" {
  const width = window.innerWidth;
  return width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";
}

function externalReferrerHost(): string | null {
  if (!document.referrer) return null;
  try {
    const host = new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, "");
    return host && host !== window.location.hostname.toLowerCase().replace(/^www\./, "") ? host.slice(0, 120) : null;
  } catch {
    return null;
  }
}

export function recordPageView(pathname: string) {
  const path = safePath(pathname);
  const visit = visitState();
  if (!path || !visit) return;
  const referrer = visit.lastPath ?? externalReferrerHost();
  visit.lastPath = path;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(visit));
  } catch {
    // Page-view recording can continue for this route without persisted state.
  }
  void Promise.resolve(supabase.from("page_views").insert({
    path,
    referrer,
    device: deviceClass(),
    session_id: visit.id,
  })).then(() => undefined).catch(() => undefined);
  void Promise.resolve(supabase.rpc("analytics_heartbeat", { p_session_id: visit.id, p_path: path })).then(() => undefined).catch(() => undefined);
}

export function updateActiveVisitor(pathname: string) {
  const path = safePath(pathname);
  const visit = visitState();
  if (!path || !visit || document.visibilityState !== "visible") return;
  void Promise.resolve(supabase.rpc("analytics_heartbeat", { p_session_id: visit.id, p_path: path })).then(() => undefined).catch(() => undefined);
}

const CLICK_CATEGORIES = new Set(["internal_link", "external_link", "button", "other_control", "booking_success"]);

export function recordClickEvent(category: string, pathname = window.location.pathname) {
  const path = safePath(pathname);
  const visit = visitState();
  if (!path || !visit || !CLICK_CATEGORIES.has(category)) return;
  void Promise.resolve(supabase.from("click_events").insert({ path, element: category, session_id: visit.id }))
    .then(() => undefined).catch(() => undefined);
}

export function recordInteractiveClick(target: EventTarget | null, clientX: number, clientY: number) {
  if (!(target instanceof Element)) return;
  const element = target.closest("a, button, [role='button']");
  if (!element) return;
  const path = safePath(window.location.pathname);
  const visit = visitState();
  if (!path || !visit) return;

  let category = "other_control";
  if (element instanceof HTMLAnchorElement) {
    try {
      category = new URL(element.href, window.location.href).origin === window.location.origin
        ? "internal_link"
        : "external_link";
    } catch {
      category = "internal_link";
    }
  } else if (element instanceof HTMLButtonElement) {
    category = "button";
  }
  recordClickEvent(category, path);

  const pageHeight = Math.max(document.documentElement.scrollHeight, window.innerHeight, 1);
  const xPct = Math.max(0, Math.min(100, (clientX / Math.max(window.innerWidth, 1)) * 100));
  const yPct = Math.max(0, Math.min(100, ((clientY + window.scrollY) / pageHeight) * 100));
  void Promise.resolve(supabase.from("heatmap_clicks").insert({
    path,
    x_pct: Number(xPct.toFixed(2)),
    y_pct: Number(yPct.toFixed(2)),
    session_id: visit.id,
  })).then(() => undefined).catch(() => undefined);
}