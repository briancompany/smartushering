import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminListNotifications } from "@/lib/admin-phase2.functions";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Admin" }] }),
  component: Page,
});

function Page() {
  const token = useAdminToken();
  const list = useServerFn(adminListNotifications);
  const { data = [] } = useQuery({ queryKey: ["notifications-all", token], queryFn: () => list({ data: { token: token! } }), enabled: !!token });
  if (!token) return null;
  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">All notifications</h1>
      <div className="mt-6 space-y-2">
        {data.map((n) => (
          <a key={n.id} href={n.link ?? "#"} className={`block rounded-lg border bg-white p-4 ${!n.read_at ? "border-gold" : ""}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-navy">{n.title}</span>
              <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
            </div>
            {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
          </a>
        ))}
        {data.length === 0 && <p className="text-muted-foreground">No notifications yet.</p>}
      </div>
    </AdminLayout>
  );
}
