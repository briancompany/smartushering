import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Users, MapPin, Building2, ShieldCheck, ArrowRight, Star } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero.jpg";
import { WHATSAPP_URL } from "@/components/WhatsAppButton";

const homeQuery = queryOptions({
  queryKey: ["home"],
  queryFn: async () => {
    const [services, testimonials] = await Promise.all([
      supabase.from("services").select("*").eq("is_active", true).order("display_order").limit(6),
      supabase.from("testimonials").select("*").eq("is_active", true).order("display_order"),
    ]);
    return { services: services.data ?? [], testimonials: testimonials.data ?? [] };
  },
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Ushering — Professional Ushering Services in Kenya" },
      { name: "description", content: "Premium ushering, guest management and event support across Kenya. 30+ trained professionals for weddings, corporate events and VIP functions." },
      { property: "og:title", content: "Smart Ushering — Premium Event Ushering in Kenya" },
      { property: "og:description", content: "Every Guest Matters. Every Event Counts." },
      { property: "og:image", content: heroImg },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: Home,
  errorComponent: ({ error }) => <div className="p-8 text-center">Couldn't load: {error.message}</div>,
});

function Home() {
  const { data } = useSuspenseQuery(homeQuery);
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-primary-foreground">
        <img src={heroImg} alt="Smart Ushering professionals welcoming guests" width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy/85 to-navy/60" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 md:py-32 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Est. 2024 · Nairobi, Kenya
            </div>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
              Professional Ushering Services for <span className="text-gold">Exceptional Events</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-primary-foreground/85">
              Providing professional guest management, hospitality support, protocol assistance and event staffing services across Kenya.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/book" className="rounded-md bg-gold px-6 py-3 text-sm font-semibold text-gold-foreground hover:opacity-90">Book Event</Link>
              <Link to="/contact" className="rounded-md border border-gold/40 bg-white/5 px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-white/10">Request Quote</Link>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="rounded-md bg-[#25D366] px-6 py-3 text-sm font-semibold text-white hover:opacity-90">Chat on WhatsApp</a>
            </div>
          </div>

          <dl className="mt-16 grid grid-cols-2 gap-6 border-t border-white/10 pt-10 md:grid-cols-4">
            {[
              { Icon: Users, label: "30+ Trained Professionals" },
              { Icon: MapPin, label: "Available Nationwide" },
              { Icon: Building2, label: "Corporate & Private Events" },
              { Icon: ShieldCheck, label: "Reliable Event Support" },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-md bg-gold/15"><Icon className="h-5 w-5 text-gold" /></div>
                <dt className="text-sm font-medium text-primary-foreground/90">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Services preview */}
      <section className="bg-cream py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">What We Do</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-navy sm:text-4xl">Premium Ushering, Tailored to Your Event</h2>
            </div>
            <Link to="/services" className="hidden items-center gap-1 text-sm font-medium text-navy hover:text-gold sm:inline-flex">View all <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.services.map((s) => (
              <article key={s.id} className="group rounded-2xl border bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-luxury">
                <div className="inline-flex h-1 w-12 bg-gold" />
                <h3 className="mt-4 font-display text-xl font-semibold text-navy">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                <Link to="/book" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy group-hover:text-gold">Book now <ArrowRight className="h-4 w-4" /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-gold">Client Voices</p>
          <h2 className="mt-2 text-center font-display text-3xl font-semibold text-navy sm:text-4xl">Trusted by hosts across Kenya</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {data.testimonials.map((t) => (
              <figure key={t.id} className="rounded-2xl bg-cream p-6">
                <div className="flex gap-0.5 text-gold">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
                <blockquote className="mt-3 text-sm leading-relaxed text-foreground/85">"{t.quote}"</blockquote>
                <figcaption className="mt-4 text-xs">
                  <div className="font-semibold text-navy">{t.author}</div>
                  <div className="text-muted-foreground">{t.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="gradient-navy py-16 text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Ready to elevate your next event?</h2>
          <p className="max-w-2xl text-primary-foreground/80">Our team is on standby across Kenya. Tell us about your event and we'll handle the rest.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/book" className="rounded-md bg-gold px-6 py-3 text-sm font-semibold text-gold-foreground hover:opacity-90">Book an Event</Link>
            <Link to="/pricing" className="rounded-md border border-gold/40 px-6 py-3 text-sm font-semibold hover:bg-white/10">View Pricing</Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
