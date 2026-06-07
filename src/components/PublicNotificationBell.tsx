import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPublicAnnouncements } from "@/lib/phase3.functions";

const LS_KEY = "su_public_anns_seen";

export function PublicNotificationBell() {
  const list = useServerFn(listPublicAnnouncements);
  const { data = [] } = useQuery({
    queryKey: ["public-announcements"],
    queryFn: () => list(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setSeenIds(JSON.parse(localStorage.getItem(LS_KEY) ?? "[]")); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const unread = data.filter((a) => !seenIds.includes(a.id)).length;

  const markAllSeen = () => {
    const ids = data.map((a) => a.id);
    setSeenIds(ids);
    try { localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((v) => !v); if (!open) markAllSeen(); }}
        aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-full border border-border/60 text-navy hover:bg-cream"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-white shadow-luxury">
          <div className="border-b bg-cream px-3 py-2 text-xs font-semibold uppercase text-navy">Announcements</div>
          <div className="max-h-96 overflow-y-auto">
            {data.length === 0 && <p className="p-4 text-sm text-muted-foreground">No announcements right now.</p>}
            {data.map((a) => (
              <div key={a.id} className="border-b px-3 py-3 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${a.priority === "urgent" ? "bg-rose-100 text-rose-700" : a.priority === "important" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{a.priority}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
                <div className="mt-1 text-sm font-semibold text-navy">{a.title}</div>
                <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
