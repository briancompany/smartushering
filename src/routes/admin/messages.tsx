import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminListContacts } from "@/lib/admin-phase2.functions";

export const Route = createFileRoute("/admin/messages")({
  head: () => ({ meta: [{ title: "Messages — Admin" }] }),
  component: Page,
});

function Page() {
  const token = useAdminToken();
  const fn = useServerFn(adminListContacts);
  const { data = [] } = useQuery({ queryKey: ["contacts", token], queryFn: () => fn({ data: { token: token! } }), enabled: !!token });
  if (!token) return null;
  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Contact messages</h1>
      <div className="mt-6 space-y-3">
        {data.map((c) => (
          <div key={c.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-navy">{c.full_name}</div>
                <div className="text-xs text-muted-foreground">{c.email}{c.phone && ` • ${c.phone}`}</div>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
            </div>
            {c.subject && <div className="mt-2 text-sm font-medium text-navy">{c.subject}</div>}
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{c.message}</p>
            <div className="mt-2 flex gap-2">
              <a href={`mailto:${c.email}`} className="rounded bg-navy px-3 py-1 text-xs text-primary-foreground">Reply by email</a>
              {c.phone && <a href={`tel:${c.phone}`} className="rounded border px-3 py-1 text-xs">Call</a>}
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="text-muted-foreground">No messages yet.</p>}
      </div>
    </AdminLayout>
  );
}
