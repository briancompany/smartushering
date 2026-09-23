import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, Calendar, DollarSign, Wrench, Image as ImageIcon, MessageSquare, HelpCircle, LogOut, ArrowLeft, Menu, X, Users, ClipboardCheck, FileText, BarChart3, ShieldCheck, Mail, Star, Database, UserCog, Megaphone, Package, AlertTriangle, Flame, LifeBuoy } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { AvatarUploader, ProfileAvatar } from "./AvatarUploader";
import { getSession, clearSession, canAccess, ROLE_LABELS, type Session } from "@/lib/auth-client";
import { adminVerify } from "@/lib/admin.functions";

type NavItem = { to: string; label: string; Icon: typeof LayoutDashboard; key: string; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, key: "dashboard", exact: true },
  { to: "/admin/analytics", label: "Analytics", Icon: BarChart3, key: "analytics" },
  { to: "/admin/bookings", label: "Bookings", Icon: Calendar, key: "bookings" },
  { to: "/admin/calendar", label: "Calendar", Icon: Calendar, key: "calendar" },
  { to: "/admin/staff", label: "Staff", Icon: Users, key: "staff" },
  { to: "/admin/assignments", label: "Assignments", Icon: ClipboardCheck, key: "assignments" },
  { to: "/admin/announcements", label: "Announcements", Icon: Megaphone, key: "announcements" },
  { to: "/admin/grievances", label: "Concerns", Icon: AlertTriangle, key: "grievances" },
  { to: "/admin/assets", label: "Assets", Icon: Package, key: "assets" },
  { to: "/admin/quotes", label: "Quotes", Icon: FileText, key: "quotes" },
  { to: "/admin/pricing", label: "Pricing", Icon: DollarSign, key: "pricing" },
  { to: "/admin/services", label: "Services", Icon: Wrench, key: "services" },
  { to: "/admin/gallery", label: "Gallery", Icon: ImageIcon, key: "gallery" },
  { to: "/admin/reviews", label: "Reviews", Icon: Star, key: "reviews" },
  { to: "/admin/chats", label: "Live Chats", Icon: MessageSquare, key: "chats" },
  { to: "/admin/messages", label: "Messages", Icon: Mail, key: "messages" },
  { to: "/admin/faqs", label: "FAQs", Icon: HelpCircle, key: "faqs" },
  { to: "/admin/accounts", label: "Accounts", Icon: UserCog, key: "accounts" },
  { to: "/admin/backups", label: "Backups", Icon: Database, key: "backups" },
  { to: "/admin/audit", label: "Audit Log", Icon: ShieldCheck, key: "audit" },
  { to: "/admin/tickets", label: "Support Tickets", Icon: LifeBuoy, key: "tickets" },
  { to: "/admin/warmup", label: "System Warm-up", Icon: Flame, key: "warmup" },
];

export function useAdminToken() {
  const navigate = useNavigate();
  const verify = useServerFn(adminVerify);
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const s = getSession();
    if (!s) { navigate({ to: "/admin/login" }); return; }
    if (s.role === "staff" && !s.is_super_admin) { navigate({ to: "/staff" }); return; }
    setToken(s.token);
    // Server-side verify: catches deactivated accounts and expired sessions.
    verify({ data: { token: s.token } }).catch(() => {
      clearSession();
      navigate({ to: "/admin/login" });
    });
  }, [navigate, verify]);
  return token;
}

function useInactivityLogout() {
  const navigate = useNavigate();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { clearSession(); navigate({ to: "/admin/login" }); }, 30 * 60 * 1000);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, reset)); };
  }, [navigate]);
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [session, setSessionState] = useState<Session | null>(null);
  const { location } = useRouterState();
  useInactivityLogout();
  useEffect(() => { setSessionState(getSession()); }, []);
  const logout = () => { clearSession(); navigate({ to: "/admin/login" }); };

  const role = session?.role ?? "super_admin";
  const isSuper = session?.is_super_admin ?? true;
  const visible = NAV.filter((n) => canAccess(role, n.key, isSuper));

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform gradient-navy text-primary-foreground transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-5">
          <Link to="/" className="flex items-center gap-2">
            <img src="/icon-512.png" alt="" width={28} height={28} className="rounded" />
            <span className="font-display text-lg font-semibold text-gold">Smart Ushering</span>
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        {session && (
          <div className="mx-3 mb-2 flex items-center gap-3 rounded-md bg-white/5 px-3 py-2.5 text-xs">
            <AvatarUploader token={session.token} name={session.full_name ?? session.username} size={44} initialUrl={session.avatar_url ?? null} />
            <div className="min-w-0">
              <div className="truncate font-semibold text-primary-foreground">{session.full_name ?? session.username}</div>
              <div className="truncate text-primary-foreground/60">{ROLE_LABELS[session.role] ?? session.role}{session.is_department_head ? " • Head" : ""}</div>
            </div>
          </div>
        )}
        <nav className="max-h-[calc(100vh-200px)] space-y-1 overflow-y-auto px-3 pb-24">
          {visible.map(({ to, label, Icon, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <Link key={to} to={to as "/admin"} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${active ? "bg-gold text-gold-foreground font-semibold" : "text-primary-foreground/80 hover:bg-white/10"}`}>
                <Icon className="h-4 w-4" />{label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-0 right-0 space-y-2 px-3">
          <Link to="/" className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-primary-foreground/70 hover:bg-white/10"><ArrowLeft className="h-3.5 w-3.5" /> Back to website</Link>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-primary-foreground/70 hover:bg-white/10"><LogOut className="h-3.5 w-3.5" /> Log out</button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-navy px-4 py-2.5 lg:px-6">
          <button className="lg:hidden text-primary-foreground" onClick={() => setOpen(true)}><Menu className="h-6 w-6" /></button>
          <span className="font-display font-semibold text-primary-foreground lg:hidden">Admin</span>
          <div className="ml-auto flex items-center gap-2">
            {session && <NotificationBell token={session.token} />}
            {session && <ProfileAvatar url={session.avatar_url} name={session.full_name ?? session.username} size={32} />}
            <button onClick={logout} className="hidden lg:flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-primary-foreground/80 hover:bg-white/10"><LogOut className="h-3.5 w-3.5" /> Logout</button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
