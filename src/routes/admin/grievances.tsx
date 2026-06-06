import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminListGrievances, adminRespondGrievance } from "@/lib/phase3.functions";

export const Route = createFileRoute("/admin/grievances")({
  head: () => ({ meta: [{ title: "Concerns — Admin" }] }),
  component: Page,
});

function Page() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const list = useServerFn(adminListGrievances);
  const respond = useServerFn(adminRespondGrievance);
  const { data = [] } = useQuery({ queryKey: ["grievances", token], queryFn: () => list({ data: { token: token! } }), enabled: !!token });
  const [reply, setReply] = useState<Record<string, string>>({});
  if (!token) return null;

  const send = async (id: string, status: "pending" | "in_review" | "resolved") => {
    try {
      await respond({ data: { token, id, status, admin_response: reply[id] } });
      setReply((r) => ({ ...r, [id]: "" }));
      qc.invalidateQueries({ queryKey: ["grievances"] });
      toast.success("Updated");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Concerns & grievances</h1>
      <p className="text-sm text-muted-foreground">Review submissions from staff and the public.</p>

      <div className="mt-6 space-y-3">
        {data.map((g) => (
          <div key={g.id} className="rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className={`rounded-full px-2 py-0.5 font-semibold uppercase ${g.status === "resolved" ? "bg-emerald-100 text-emerald-700" : g.status === "in_review" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{g.status}</span>
              <span>{g.is_anonymous ? "Anonymous Submission" : (g.submitted_by_name ?? "Unknown")}</span>
              {g.department && <span>• {g.department}</span>}
              <span>• {new Date(g.created_at).toLocaleString()}</span>
            </div>
            <h3 className="mt-1 font-semibold text-navy">{g.subject}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm">{g.body}</p>
            {g.admin_response && (
              <div className="mt-2 rounded-md bg-cream p-3 text-sm">
                <div className="text-xs font-semibold text-navy">Response by {g.responded_by ?? "admin"}</div>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{g.admin_response}</p>
              </div>
            )}
            <textarea value={reply[g.id] ?? ""} onChange={(e) => setReply({ ...reply, [g.id]: e.target.value })} placeholder="Write a response…" rows={2} className="mt-3 w-full rounded-md border px-3 py-2 text-sm" />
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => send(g.id, "in_review")} className="rounded bg-amber-600 px-3 py-1 text-xs text-white">Mark in review</button>
              <button onClick={() => send(g.id, "resolved")} className="rounded bg-emerald-600 px-3 py-1 text-xs text-white">Mark resolved</button>
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="rounded-xl border bg-white p-6 text-center text-sm text-muted-foreground">No concerns submitted.</p>}
      </div>
    </AdminLayout>
  );
}
