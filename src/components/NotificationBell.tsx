import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminListNotifications, adminMarkNotificationRead } from "@/lib/admin-phase2.functions";

export function NotificationBell({ token }: { token: string }) {
  const qc = useQueryClient();
  const list = useServerFn(adminListNotifications);
  const mark = useServerFn(adminMarkNotificationRead);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => list({ data: { token } }),
    refetchInterval: 30000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("admin-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-notifications"] });
        try { new Audio("data:audio/wav;base64,UklGRhwAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=").play().catch(() => {}); } catch { /* noop */ }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const unread = items.filter((n) => !n.read_at).length;

  const onClickItem = async (id: string, link: string | null) => {
    await mark({ data: { token, id } });
    qc.invalidateQueries({ queryKey: ["admin-notifications"] });
    setOpen(false);
    if (link) window.location.href = link;
  };

  const markAll = async () => {
    await mark({ data: { token, all: true } });
    qc.invalidateQueries({ queryKey: ["admin-notifications"] });
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="relative rounded-full p-2 hover:bg-white/10" aria-label="Notifications">
        <Bell className="h-5 w-5 text-primary-foreground" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">{unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="font-semibold text-navy">Notifications</span>
            {unread > 0 && <button onClick={markAll} className="text-xs text-navy underline">Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">All clear ✨</div>}
            {items.slice(0, 20).map((n) => (
              <button key={n.id} onClick={() => onClickItem(n.id, n.link)} className={`block w-full border-b px-4 py-3 text-left text-sm hover:bg-cream ${!n.read_at ? "bg-cream/60" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-navy">{n.title}</span>
                  {!n.read_at && <span className="h-2 w-2 rounded-full bg-gold" />}
                </div>
                {n.body && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</div>}
                <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
              </button>
            ))}
          </div>
          <Link to="/admin/notifications" onClick={() => setOpen(false)} className="block border-t bg-cream px-4 py-2 text-center text-xs font-semibold text-navy">View all</Link>
        </div>
      )}
    </div>
  );
}
