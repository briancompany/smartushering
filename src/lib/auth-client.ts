// Lightweight client-side helpers for admin/staff session stored in localStorage.
export type Session = {
  token: string;
  username: string;
  role: string;
  is_super_admin: boolean;
  is_department_head: boolean;
  department: string | null;
  full_name: string | null;
};

const KEY = "su_admin_session";
const LEGACY_TOKEN_KEY = "su_admin_token";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Session;
  } catch { /* fallthrough */ }
  // Legacy migration
  const t = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (t) return { token: t, username: "admin", role: "super_admin", is_super_admin: true, is_department_head: false, department: null, full_name: null };
  return null;
}

export function setSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s));
  localStorage.setItem(LEGACY_TOKEN_KEY, s.token); // keep legacy key for older components
}

export function clearSession() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

// Role → which top-level nav items are visible
export const ROLE_NAV: Record<string, string[]> = {
  super_admin: ["dashboard","analytics","bookings","calendar","staff","assignments","quotes","pricing","services","gallery","reviews","chats","messages","faqs","accounts","backups","audit"],
  staff_management: ["dashboard","staff","assignments","accounts"],
  bookings_operations: ["dashboard","bookings","calendar","assignments","quotes","pricing"],
  customer_support: ["dashboard","chats","messages","bookings"],
  media_content: ["dashboard","services","gallery","faqs","reviews"],
  finance_reporting: ["dashboard","analytics","quotes"],
  staff: ["dashboard","assignments"],
};

export function canAccess(role: string, key: string, isSuperAdmin: boolean): boolean {
  if (isSuperAdmin) return true;
  return (ROLE_NAV[role] ?? []).includes(key);
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  staff_management: "Staff Management",
  bookings_operations: "Bookings & Operations",
  customer_support: "Customer Support",
  media_content: "Media & Content",
  finance_reporting: "Finance & Reporting",
  staff: "Staff / Usher",
};
