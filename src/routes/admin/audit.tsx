import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminListAudit } from "@/lib/admin-phase2.functions";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit Log — Admin" }] }),
  component: Page,
});

function Page() {
  const token = useAdminToken();
  const list = useServerFn(adminListAudit);
  const { data = [] } = useQuery({ queryKey: ["audit", token], queryFn: () => list({ data: { token: token! } }), enabled: !!token });
  if (!token) return null;
  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Audit log</h1>
      <p className="text-sm text-muted-foreground">Every admin action is recorded here for accountability.</p>
      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase text-muted-foreground"><tr>{["When","Actor","Action","Entity","Details"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium">{r.actor}</td>
                <td className="px-4 py-3"><code className="rounded bg-cream px-1.5 py-0.5 text-xs">{r.action}</code></td>
                <td className="px-4 py-3">{r.entity}</td>
                <td className="px-4 py-3"><pre className="max-w-xs overflow-hidden text-[10px] text-muted-foreground">{r.diff ? JSON.stringify(r.diff, null, 0).slice(0, 200) : "—"}</pre></td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
