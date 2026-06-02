import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LayoutDashboard, Calendar, DollarSign, Wrench, Image as ImageIcon, MessageSquare, HelpCircle, LogOut, ArrowLeft, Menu, X } from "lucide-react";

const NAV = [
  { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { to: "/admin/bookings", label: "Bookings", Icon: Calendar },
  { to: "/admin/pricing", label: "Pricing", Icon: DollarSign },
  { to: "/admin/services", label: "Services", Icon: Wrench },
  { to: "/admin/gallery", label: "Gallery", Icon: ImageIcon },
  { to: "/admin/chats", label: "Live Chats", Icon: MessageSquare },
  { to: "/admin/faqs", label: "FAQs", Icon: HelpCircle },
] as const;

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

export function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { location } = useRouterState();
  const logout = () => { localStorage.removeItem("su_admin_token"); navigate({ to: "/admin/login" }); };
  return (
    <div className="flex min-h-screen bg-cream">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform gradient-navy text-primary-foreground transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-5">
          <Link to="/" className="font-display text-lg font-semibold text-gold">Smart Ushering</Link>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="space-y-1 px-3">
          {NAV.map(({ to, label, Icon, exact }) => {
            const active = exact ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <Link key={to} to={to} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm ${active ? "bg-gold text-gold-foreground font-semibold" : "text-primary-foreground/80 hover:bg-white/10"}`}>
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
        <header className="flex items-center justify-between border-b bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)}><Menu className="h-6 w-6" /></button>
          <span className="font-display font-semibold text-navy">Admin</span>
          <button onClick={logout} className="text-xs text-muted-foreground"><LogOut className="h-4 w-4" /></button>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
