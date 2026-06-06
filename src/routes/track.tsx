import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PublicLayout } from "@/components/PublicLayout";
import { clientTrackBooking } from "@/lib/phase3.functions";

export const Route = createFileRoute("/track")({
  head: () => ({ meta: [
    { title: "Track your booking — Smart Ushering" },
    { name: "description", content: "Check the live status of your event booking with your reference number." },
  ] }),
  component: Page,
});

type TrackResult = Awaited<ReturnType<typeof clientTrackBooking>>;

function Page() {
  const track = useServerFn(clientTrackBooking);
  const [form, setForm] = useState({ reference: "", phone_last4: "" });
  const [result, setResult] = useState<TrackResult | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const r = await track({ data: form });
      setResult(r);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Not found"); }
    finally { setLoading(false); }
  };

  return (
    <PublicLayout>
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl font-semibold text-navy">Track your booking</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your booking reference and the last 4 digits of your phone number.</p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-3 rounded-xl border bg-white p-6 sm:grid-cols-2">
          <input required placeholder="Booking reference (e.g. SU-XXXX)" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="rounded-md border px-3 py-2 text-sm sm:col-span-2" />
          <input required placeholder="Last 4 digits of phone" maxLength={4} value={form.phone_last4} onChange={(e) => setForm({ ...form, phone_last4: e.target.value.replace(/\D/g, "") })} className="rounded-md border px-3 py-2 text-sm sm:col-span-2" />
          <button disabled={loading} className="rounded-md bg-navy py-2.5 text-sm font-semibold text-primary-foreground sm:col-span-2 disabled:opacity-50">{loading ? "Checking…" : "Track booking"}</button>
        </form>

        {result && (
          <div className="mt-6 rounded-xl border bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-navy">{result.event_type}</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${result.status === "approved" ? "bg-emerald-100 text-emerald-700" : result.status === "rejected" ? "bg-rose-100 text-rose-700" : result.status === "completed" ? "bg-slate-200" : "bg-amber-100 text-amber-800"}`}>{result.status}</span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs uppercase text-muted-foreground">Reference</dt><dd className="font-mono">{result.reference}</dd></div>
              <div><dt className="text-xs uppercase text-muted-foreground">Date</dt><dd>{result.event_date}</dd></div>
              <div><dt className="text-xs uppercase text-muted-foreground">Venue</dt><dd>{result.venue}, {result.county}</dd></div>
              <div><dt className="text-xs uppercase text-muted-foreground">Ushers</dt><dd>{result.number_of_ushers}</dd></div>
              <div><dt className="text-xs uppercase text-muted-foreground">Estimated total</dt><dd>KES {result.estimated_cost_kes?.toLocaleString()}</dd></div>
            </dl>
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
