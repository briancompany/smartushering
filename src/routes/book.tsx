import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { supabase } from "@/integrations/supabase/client";

const q = queryOptions({
  queryKey: ["book-data"],
  queryFn: async () => {
    const [pkgs, settings] = await Promise.all([
      supabase.from("pricing_packages").select("*").order("display_order"),
      supabase.from("site_settings").select("*"),
    ]);
    const transport = Number(settings.data?.find((s) => s.key === "transport_nairobi_kes")?.value ?? 200);
    return { packages: pkgs.data ?? [], transport };
  },
});

export const Route = createFileRoute("/book")({
  head: () => ({ meta: [{ title: "Book Event — Smart Ushering" }, { name: "description", content: "Book professional ushers for your event. Quick form, instant cost estimate." }], links: [{ rel: "canonical", href: "/book" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Page,
  errorComponent: ({ error }) => <div className="p-8">{error.message}</div>,
});

function ref() {
  return "SU-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function Page() {
  const { data } = useSuspenseQuery(q);
  const [submitted, setSubmitted] = useState<{ reference: string; cost: number } | null>(null);
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", event_type: "Wedding",
    package_slug: data.packages[0]?.slug ?? "standard",
    number_of_ushers: 4, event_date: "", venue: "", county: "Nairobi", special_instructions: "",
  });
  const pkg = useMemo(() => data.packages.find((p) => p.slug === form.package_slug), [data, form.package_slug]);
  const estimate = useMemo(() => {
    if (!pkg) return 0;
    const base = pkg.price_kes * form.number_of_ushers;
    const transport = form.county.toLowerCase() === "nairobi" ? data.transport * form.number_of_ushers : 0;
    return base + transport;
  }, [pkg, form.number_of_ushers, form.county, data.transport]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkg) return;
    const reference = ref();
    const { error } = await supabase.from("bookings").insert({
      reference, full_name: form.full_name, phone: form.phone, email: form.email,
      event_type: form.event_type, package_slug: form.package_slug, package_price_kes: pkg.price_kes,
      number_of_ushers: form.number_of_ushers, event_date: form.event_date, venue: form.venue,
      county: form.county, special_instructions: form.special_instructions || null,
      estimated_cost_kes: estimate,
    });
    if (error) { toast.error(error.message); return; }
    setSubmitted({ reference, cost: estimate });
  };

  if (submitted) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
          <CheckCircle2 className="mx-auto h-16 w-16 text-gold" />
          <h1 className="mt-6 font-display text-3xl font-semibold text-navy">Booking received!</h1>
          <p className="mt-3 text-muted-foreground">Your reference number is:</p>
          <p className="mt-1 font-display text-2xl font-bold text-navy">{submitted.reference}</p>
          <div className="mt-6 rounded-2xl border bg-cream p-6">
            <div className="text-sm text-muted-foreground">Estimated cost</div>
            <div className="font-display text-3xl font-bold text-navy">KES {submitted.cost.toLocaleString()}</div>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">We'll confirm availability and contact you shortly on the phone/email provided.</p>
          <Link to="/" className="mt-6 inline-block rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-primary-foreground">Back to home</Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="bg-cream py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy"><ArrowLeft className="h-4 w-4" /> Back</Link>
          <h1 className="mt-3 font-display text-3xl font-semibold text-navy sm:text-4xl">Book Your Event</h1>
          <p className="mt-2 text-muted-foreground">No account required. We'll respond shortly.</p>

          <form onSubmit={submit} className="mt-8 grid gap-4 rounded-2xl border bg-white p-6 shadow-sm sm:grid-cols-2">
            <Field label="Full Name *"><input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input" /></Field>
            <Field label="Phone *"><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></Field>
            <Field label="Email *"><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></Field>
            <Field label="Event Type *">
              <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="input">
                {["Wedding","Corporate Event","Conference","Seminar","Gala Dinner","Graduation","Funeral","Award Ceremony","Government Function","Church Event","Product Launch","Brand Activation","Other"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Package *">
              <select value={form.package_slug} onChange={(e) => setForm({ ...form, package_slug: e.target.value })} className="input">
                {data.packages.map((p) => <option key={p.slug} value={p.slug}>{p.name} — KES {p.price_kes.toLocaleString()}</option>)}
              </select>
            </Field>
            <Field label="Number of Ushers *"><input type="number" min={1} max={500} required value={form.number_of_ushers} onChange={(e) => setForm({ ...form, number_of_ushers: Number(e.target.value) })} className="input" /></Field>
            <Field label="Event Date *"><input type="date" required value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="input" /></Field>
            <Field label="County *"><input required value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} className="input" /></Field>
            <Field label="Venue *" full><input required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="input" /></Field>
            <Field label="Special Instructions" full><textarea rows={3} value={form.special_instructions} onChange={(e) => setForm({ ...form, special_instructions: e.target.value })} className="input" /></Field>

            <div className="sm:col-span-2 rounded-xl bg-cream p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Estimated cost</span>
                <span className="font-display text-2xl font-bold text-navy">KES {estimate.toLocaleString()}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Includes transport for {form.county} if applicable. Host provides lunch for all ushers.</p>
            </div>
            <button className="sm:col-span-2 rounded-md bg-navy py-3 font-semibold text-primary-foreground hover:opacity-90">Submit Booking</button>
          </form>
        </div>
      </section>
      <style>{`.input{width:100%;border:1px solid var(--color-border);border-radius:0.5rem;padding:0.625rem 0.75rem;font-size:0.875rem;background:white}`}</style>
    </PublicLayout>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
