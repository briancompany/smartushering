import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Star, Check, Trash2 } from "lucide-react";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminListReviews, adminUpdateReview, adminDeleteReview } from "@/lib/reviews.functions";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({ meta: [{ title: "Reviews — Admin" }] }),
  component: Page,
});

function Page() {
  const token = useAdminToken();
  const list = useServerFn(adminListReviews);
  const update = useServerFn(adminUpdateReview);
  const del = useServerFn(adminDeleteReview);
  const { data = [], refetch } = useQuery({ queryKey: ["admin-reviews", token], queryFn: () => list({ data: { token: token! } }), enabled: !!token });
  if (!token) return null;

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Reviews</h1>
      <p className="text-sm text-muted-foreground">Approve customer reviews to publish them on the public Reviews page.</p>
      <div className="mt-6 space-y-3">
        {data.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
        {data.map((r) => (
          <div key={r.id} className={`rounded-xl border bg-white p-4 ${r.is_approved ? "border-emerald-200" : "border-amber-200"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-navy">{r.author} {r.email && <span className="text-xs font-normal text-muted-foreground">· {r.email}</span>}</div>
                <div className="text-xs text-muted-foreground">{[r.role, r.event_type].filter(Boolean).join(" • ") || "—"} · {new Date(r.created_at).toLocaleString()}</div>
                <div className="mt-1 flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-gold text-gold" : "text-muted-foreground"}`} />)}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={async () => { await update({ data: { token, id: r.id, is_approved: !r.is_approved } }); refetch(); }}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold ${r.is_approved ? "bg-amber-100 text-amber-900" : "bg-emerald-600 text-white"}`}>
                  <Check className="h-3.5 w-3.5" /> {r.is_approved ? "Unpublish" : "Approve"}
                </button>
                <button onClick={async () => { if (confirm("Delete this review?")) { await del({ data: { token, id: r.id } }); refetch(); } }}
                  className="inline-flex items-center gap-1 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm text-foreground/80">&ldquo;{r.quote}&rdquo;</p>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
