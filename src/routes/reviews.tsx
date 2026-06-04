import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Star, ArrowLeft } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { listApprovedReviews, submitReview } from "@/lib/reviews.functions";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Customer Reviews — Smart Ushering Nairobi" },
      { name: "description", content: "Read genuine reviews from Smart Ushering clients across Kenya and share your own experience with our professional event ushers." },
      { property: "og:title", content: "Customer Reviews — Smart Ushering" },
      { property: "og:description", content: "Hear from clients who trusted Smart Ushering for their weddings, corporate galas, and VIP events." },
    ],
  }),
  component: Page,
});

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange?.(n)} className="transition" aria-label={`${n} star${n > 1 ? "s" : ""}`}>
          <Star className={`h-6 w-6 ${n <= value ? "fill-gold text-gold" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}

function Page() {
  const list = useServerFn(listApprovedReviews);
  const submit = useServerFn(submitReview);
  const { data: reviews = [], refetch } = useQuery({ queryKey: ["reviews-public"], queryFn: () => list() });

  const [form, setForm] = useState({ author: "", email: "", role: "", event_type: "", rating: 5, quote: "" });
  const [status, setStatus] = useState<{ type: "idle" | "ok" | "err"; msg?: string }>({ type: "idle" });
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setStatus({ type: "idle" });
    try {
      await submit({ data: form });
      setStatus({ type: "ok", msg: "Thank you! Your review will appear once it's approved." });
      setForm({ author: "", email: "", role: "", event_type: "", rating: 5, quote: "" });
      refetch();
    } catch (err) {
      setStatus({ type: "err", msg: err instanceof Error ? err.message : "Could not submit." });
    } finally { setBusy(false); }
  }

  return (
    <PublicLayout>
      <section className="bg-navy py-16 text-primary-foreground">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-gold hover:underline"><ArrowLeft className="h-4 w-4" /> Back to home</Link>
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">Customer Reviews</h1>
          <p className="mt-3 max-w-2xl text-primary-foreground/80">Real feedback from clients we have served. Loved working with us? Leave a review below.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8">
        <div>
          <h2 className="font-display text-2xl font-semibold text-navy">What clients say</h2>
          <div className="mt-6 space-y-4">
            {reviews.length === 0 && <p className="text-muted-foreground">No reviews yet — be the first to share your experience.</p>}
            {reviews.map((r) => (
              <article key={r.id} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-navy">{r.author}</div>
                    {(r.role || r.event_type) && <div className="text-xs text-muted-foreground">{[r.role, r.event_type].filter(Boolean).join(" • ")}</div>}
                  </div>
                  <Stars value={r.rating} />
                </div>
                <p className="mt-3 text-sm text-foreground/80">&ldquo;{r.quote}&rdquo;</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border bg-cream p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold text-navy">Leave a review</h2>
          <p className="mt-1 text-xs text-muted-foreground">Reviews are moderated before publishing.</p>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <input required maxLength={120} placeholder="Your name *" className="w-full rounded-md border bg-white px-3 py-2 text-sm" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            <input type="email" maxLength={200} placeholder="Email (optional, not published)" className="w-full rounded-md border bg-white px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input maxLength={120} placeholder="Your role e.g. Bride, HR Manager" className="w-full rounded-md border bg-white px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <input maxLength={120} placeholder="Event type e.g. Wedding, Conference" className="w-full rounded-md border bg-white px-3 py-2 text-sm" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />
            <div>
              <div className="mb-1 text-xs font-medium text-navy">Rating</div>
              <Stars value={form.rating} onChange={(n) => setForm({ ...form, rating: n })} />
            </div>
            <textarea required minLength={10} maxLength={1000} rows={4} placeholder="Share your experience…" className="w-full rounded-md border bg-white px-3 py-2 text-sm" value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} />
            <button disabled={busy} className="w-full rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Submitting…" : "Submit review"}</button>
            {status.type === "ok" && <p className="text-sm text-emerald-700">{status.msg}</p>}
            {status.type === "err" && <p className="text-sm text-destructive">{status.msg}</p>}
          </form>
        </aside>
      </section>
    </PublicLayout>
  );
}
