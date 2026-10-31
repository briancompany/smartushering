import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { CheckCircle2, ArrowLeft, BadgePercent, Users, X } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { supabase } from "@/integrations/supabase/client";

type Pkg = { id: string; slug: string; name: string; description: string; price_kes: number; features: unknown };
type AddOn = { id: string; name: string; description: string; price_kes: number; unit: string; is_active: boolean };

const q = queryOptions({
  queryKey: ["book-data"],
  queryFn: async () => {
    const [pkgs, settings, addons, unavailable] = await Promise.all([
      supabase.from("pricing_packages").select("*").order("display_order"),
      supabase.from("site_settings").select("*").in("key", ["transport_nairobi_kes"]),
      supabase.from("add_ons").select("id, name, description, price_kes, unit, is_active").eq("is_active", true).order("display_order"),
      supabase.rpc("get_unavailable_dates"),
    ]);
    const transport = Number(settings.data?.find((s) => s.key === "transport_nairobi_kes")?.value ?? 200);
    return {
      packages: (pkgs.data ?? []) as Pkg[],
      transport,
      addons: (addons.data ?? []) as AddOn[],
      unavailable: new Map<string, string>((unavailable.data ?? []).map((r: { event_date: string; kind: string }) => [r.event_date, r.kind])),
    };
  },
});

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book Event — Smart Ushering" },
      { name: "description", content: "Book professional ushers for your event. Add-ons, discount codes and instant cost estimate." },
      { property: "og:title", content: "Book Event — Smart Ushering" },
      { property: "og:description", content: "Book professional ushers for your event. Add-ons, discount codes and instant cost estimate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://smartushering.lovable.app/book" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Page,
  errorComponent: ({ error }) => <div className="p-8">{error instanceof Error ? error.message : String(error)}</div>,
});

function ref() {
  return "SU-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

const UNIT_LABEL: Record<string, string> = { per_day: "per day", per_usher: "per usher", per_event: "per event" };

function Page() {
  const { data } = useSuspenseQuery(q);
  const [submitted, setSubmitted] = useState<{ reference: string; cost: number } | null>(null);
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", event_type: "Wedding",
    package_slug: data.packages[0]?.slug ?? "standard",
    number_of_ushers: 4, event_date: "", venue: "", county: "Nairobi", special_instructions: "",
  });
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; message: string } | null>(null);
  const [referralInput, setReferralInput] = useState("");
  const [appliedReferral, setAppliedReferral] = useState<{ code: string; name: string } | null>(null);
  const [checking, setChecking] = useState(false);

  const pkg = useMemo(() => data.packages.find((p) => p.slug === form.package_slug), [data, form.package_slug]);

  const chosenAddons = useMemo(
    () => data.addons.filter((a) => selectedAddons[a.id]),
    [data.addons, selectedAddons],
  );

  const addonCost = (a: AddOn) => (a.unit === "per_usher" ? a.price_kes * form.number_of_ushers : a.price_kes);
  const addonsTotal = chosenAddons.reduce((sum, a) => sum + addonCost(a), 0);

  const base = pkg ? pkg.price_kes * form.number_of_ushers : 0;
  const transport = form.county.toLowerCase() === "nairobi" ? data.transport * form.number_of_ushers : 0;
  const subtotal = base + transport + addonsTotal;

  // Keep the applied promo's discount in sync with a changing subtotal.
  useEffect(() => {
    if (!appliedPromo) return;
    let cancelled = false;
    supabase.rpc("check_promo", { _code: appliedPromo.code, _subtotal: subtotal }).then(({ data: rows }) => {
      const r = Array.isArray(rows) ? rows[0] : null;
      if (cancelled) return;
      if (r?.valid) setAppliedPromo({ code: appliedPromo.code, discount: r.discount_kes, message: r.message });
      else setAppliedPromo(null);
    });
    return () => { cancelled = true; };
  }, [subtotal, appliedPromo?.code]); // eslint-disable-line react-hooks/exhaustive-deps

  const dateUnavailable = form.event_date ? data.unavailable.get(form.event_date) : undefined;

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setChecking(true);
    const { data: rows, error } = await supabase.rpc("check_promo", { _code: code, _subtotal: subtotal });
    setChecking(false);
    const r = Array.isArray(rows) ? rows[0] : null;
    if (error || !r) { toast.error("Couldn't check that code. Try again."); return; }
    if (r.valid) {
      setAppliedPromo({ code, discount: r.discount_kes, message: r.message });
      toast.success(r.message || "Discount applied!");
    } else {
      setAppliedPromo(null);
      toast.error(r.message || "That code isn't valid.");
    }
  };

  const applyReferral = async () => {
    const code = referralInput.trim().toUpperCase();
    if (!code) return;
    setChecking(true);
    const { data: rows, error } = await supabase.rpc("validate_referral", { _code: code });
    setChecking(false);
    const r = Array.isArray(rows) ? rows[0] : null;
    if (error || !r) { toast.error("Couldn't check that code. Try again."); return; }
    if (r.valid) {
      setAppliedReferral({ code, name: r.referrer_name });
      toast.success(`Referred by ${r.referrer_name} — they'll earn 5% off their next booking.`);
    } else {
      setAppliedReferral(null);
      toast.error("That referral code isn't valid.");
    }
  };

  const estimate = Math.max(0, subtotal - (appliedPromo?.discount ?? 0));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkg) return;
    if (form.event_date && data.unavailable.has(form.event_date)) {
      toast.error("That date is not available. Please pick another date or contact us.");
      return;
    }
    const reference = ref();
    const { error } = await supabase.from("bookings").insert({
      reference, full_name: form.full_name, phone: form.phone, email: form.email,
      event_type: form.event_type, package_slug: form.package_slug, package_price_kes: pkg.price_kes,
      number_of_ushers: form.number_of_ushers, event_date: form.event_date, venue: form.venue,
      county: form.county, special_instructions: form.special_instructions || null,
      add_ons: chosenAddons.length
        ? chosenAddons.map((a) => ({ id: a.id, name: a.name, unit: a.unit, price_kes: a.price_kes, amount: addonCost(a) }))
        : null,
      promo_code: appliedPromo?.code ?? null,
      referral_code: appliedReferral?.code ?? null,
      discount_kes: appliedPromo?.discount ?? 0,
      estimated_cost_kes: estimate,
    });
    if (error) { toast.error(error.message); return; }
    if (appliedPromo) {
      supabase.rpc("redeem_promo", { _code: appliedPromo.code }).then(({ error: rErr }) => {
        if (rErr) console.warn("promo redeem failed:", rErr.message);
      });
    }
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
            <Field label="Event Date *">
              <input type="date" required value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="input" />
              {dateUnavailable && (
                <span className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600"><X className="h-3.5 w-3.5" />{dateUnavailable === "blocked" ? "We're closed on this date — please choose another." : "This date is fully booked — please choose another or contact us."}</span>
              )}
            </Field>
            <Field label="County *"><input required value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} className="input" /></Field>
            <Field label="Venue *" full><input required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="input" /></Field>
            <Field label="Special Instructions" full><textarea rows={3} value={form.special_instructions} onChange={(e) => setForm({ ...form, special_instructions: e.target.value })} className="input" /></Field>

            {data.addons.length > 0 && (
              <div className="sm:col-span-2 rounded-xl border bg-cream p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-navy"><Users className="h-4 w-4 text-gold" /> Optional add-ons</div>
                <div className="mt-3 grid gap-2">
                  {data.addons.map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0"
                        checked={!!selectedAddons[a.id]}
                        onChange={(e) => setSelectedAddons({ ...selectedAddons, [a.id]: e.target.checked })}
                      />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="font-medium text-navy">{a.name}</span>
                        {a.description && <span className="block text-xs text-muted-foreground">{a.description}</span>}
                      </span>
                      <span className="shrink-0 text-right text-sm font-semibold text-navy">
                        KES {a.price_kes.toLocaleString()}
                        <span className="block text-[11px] font-normal text-muted-foreground">{UNIT_LABEL[a.unit] ?? a.unit}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-cream p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-navy"><BadgePercent className="h-4 w-4 text-gold" /> Discount code</div>
                <div className="mt-2 flex gap-2">
                  <input value={promoInput} onChange={(e) => { setPromoInput(e.target.value); setAppliedPromo(null); }} placeholder="e.g. WEDDING10" className="input min-w-0 flex-1" />
                  <button type="button" onClick={applyPromo} disabled={checking} className="shrink-0 rounded-md bg-navy px-4 text-xs font-semibold text-primary-foreground disabled:opacity-60">{appliedPromo ? "Reapply" : "Apply"}</button>
                </div>
                {appliedPromo && <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 className="h-3.5 w-3.5" />{appliedPromo.code} applied — you save KES {appliedPromo.discount.toLocaleString()}</p>}
              </div>
              <div className="rounded-xl border bg-cream p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-navy"><GiftIcon /> Referral code</div>
                <div className="mt-2 flex gap-2">
                  <input value={referralInput} onChange={(e) => { setReferralInput(e.target.value); setAppliedReferral(null); }} placeholder="Friend's referral code" className="input min-w-0 flex-1" />
                  <button type="button" onClick={applyReferral} disabled={checking} className="shrink-0 rounded-md bg-navy px-4 text-xs font-semibold text-primary-foreground disabled:opacity-60">{appliedReferral ? "Reapply" : "Apply"}</button>
                </div>
                {appliedReferral ? (
                  <p className="mt-2 flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 className="h-3.5 w-3.5" />Referred by {appliedReferral.name}</p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Know someone who refers us? Their code earns them 5% off. <Link to="/refer" className="underline">About referrals</Link></p>
                )}
              </div>
            </div>

            <div className="sm:col-span-2 rounded-xl bg-cream p-4">
              <div className="text-sm font-semibold text-navy">Cost summary</div>
              <dl className="mt-2 space-y-1 text-sm">
                {pkg && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{pkg.name} × {form.number_of_ushers} usher(s)</dt><dd>KES {base.toLocaleString()}</dd></div>}
                {transport > 0 && <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Transport within Nairobi × {form.number_of_ushers}</dt><dd>KES {transport.toLocaleString()}</dd></div>}
                {chosenAddons.map((a) => (
                  <div key={a.id} className="flex justify-between gap-4"><dt className="text-muted-foreground">{a.name} <span className="text-xs">({UNIT_LABEL[a.unit] ?? a.unit})</span></dt><dd>KES {addonCost(a).toLocaleString()}</dd></div>
                ))}
                <div className="flex justify-between gap-4 border-t border-border pt-1"><dt className="text-muted-foreground">Subtotal</dt><dd>KES {subtotal.toLocaleString()}</dd></div>
                {(appliedPromo?.discount ?? 0) > 0 && <div className="flex justify-between gap-4 text-green-700"><dt>Discount ({appliedPromo?.code})</dt><dd>− KES {appliedPromo?.discount.toLocaleString()}</dd></div>}
              </dl>
              <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-sm font-semibold text-navy">Estimated total</span>
                <span className="font-display text-2xl font-bold text-navy">KES {estimate.toLocaleString()}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Host provides lunch for all ushers. Outside Nairobi, transport is agreed during booking.</p>
            </div>
            <button className="sm:col-span-2 rounded-md bg-navy py-3 font-semibold text-primary-foreground hover:opacity-90">Submit Booking</button>
          </form>
        </div>
      </section>
      <style>{`.input{width:100%;border:1px solid var(--color-border);border-radius:0.5rem;padding:0.625rem 0.75rem;font-size:0.875rem;background:white}`}</style>
    </PublicLayout>
  );
}

function GiftIcon() {
  return <Gift className="h-4 w-4 text-gold" />;
}

import { Gift } from "lucide-react";

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
