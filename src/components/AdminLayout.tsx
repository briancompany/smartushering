import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, Calendar, DollarSign, Wrench, Image as ImageIcon, MessageSquare, HelpCircle, LogOut, ArrowLeft, Menu, X, Users, ClipboardCheck, FileText, BarChart3, ShieldCheck, Mail, Star, Database } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

type NavItem = { to: string; label: string; Icon: typeof LayoutDashboard; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { to: "/admin/analytics", label: "Analytics", Icon: BarChart3 },
  { to: "/admin/bookings", label: "Bookings", Icon: Calendar },
  { to: "/admin/calendar", label: "Calendar", Icon: Calendar },
  { to: "/admin/staff", label: "Staff", Icon: Users },
  { to: "/admin/assignments", label: "Assignments", Icon: ClipboardCheck },
  { to: "/admin/quotes", label: "Quotes", Icon: FileText },
  { to: "/admin/pricing", label: "Pricing", Icon: DollarSign },
  { to: "/admin/services", label: "Services", Icon: Wrench },
  { to: "/admin/gallery", label: "Gallery", Icon: ImageIcon },
  { to: "/admin/reviews", label: "Reviews", Icon: Star },
  { to: "/admin/chats", label: "Live Chats", Icon: MessageSquare },
  { to: "/admin/messages", label: "Messages", Icon: Mail },
  { to: "/admin/faqs", label: "FAQs", Icon: HelpCircle },
  { to: "/admin/backups", label: "Backups", Icon: Database },
  { to: "/admin/audit", label: "Audit Log", Icon: ShieldCheck },
];

export function useAdminToken() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const t = localStorage.getItem("su_admin_token");
    if (!t) { navigate({ to: "/admin/login" }); return; }
    setToken(t);
  }, [navigate]);
  return token;
}

// 30-minute inactivity auto-logout
function useInactivityLogout() {
  const navigate = useNavigate();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.removeItem("su_admin_token");
        navigate({ to: "/admin/login" });
      }, 30 * 60 * 1000);
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
  const { location } = useRouterState();
  const token = typeof window !== "undefined" ? localStorage.getItem("su_admin_token") : null;
  useInactivityLogout();
  const logout = () => { localStorage.removeItem("su_admin_token"); navigate({ to: "/admin/login" }); };
  return (
    <div className="flex min-h-screen bg-cream">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform gradient-navy text-primary-foreground transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-5">
          <Link to="/" className="font-display text-lg font-semibold text-gold">Smart Ushering</Link>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="max-h-[calc(100vh-160px)] space-y-1 overflow-y-auto px-3 pb-24">
          {NAV.map(({ to, label, Icon, exact }) => {
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
            {token && <NotificationBell token={token} />}
            <button onClick={logout} className="hidden lg:flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-primary-foreground/80 hover:bg-white/10"><LogOut className="h-3.5 w-3.5" /> Logout</button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
