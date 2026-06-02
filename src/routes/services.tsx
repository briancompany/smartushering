import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { PublicLayout } from "@/components/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { WHATSAPP_URL } from "@/components/WhatsAppButton";

const q = queryOptions({
  queryKey: ["services"],
  queryFn: async () => (await supabase.from("services").select("*").eq("is_active", true).order("display_order")).data ?? [],
});

export const Route = createFileRoute("/services")({
  head: () => ({ meta: [{ title: "Our Services — Smart Ushering Kenya" }, { name: "description", content: "Wedding ushering, corporate events, VIP guest management, conferences and more across Kenya." }], links: [{ rel: "canonical", href: "/services" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Page,
  errorComponent: ({ error }) => <div className="p-8">Couldn't load: {error.message}</div>,
});

function Page() {
  const { data: services } = useSuspenseQuery(q);
  return (
    <PublicLayout>
      <section className="gradient-navy py-16 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Services</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Every event. Every guest. Every detail.</h1>
          <p className="mt-4 max-w-2xl text-primary-foreground/80">From intimate weddings to high-profile state functions, we deliver professional ushering tailored to your occasion.</p>
        </div>
      </section>
      <section className="bg-cream py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
          {services.map((s) => (
            <article key={s.id} className="flex flex-col rounded-2xl border bg-white p-6 shadow-sm">
              <span className="inline-flex h-1 w-10 bg-gold" />
              <h2 className="mt-4 font-display text-xl font-semibold text-navy">{s.title}</h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="rounded-md bg-[#25D366] px-3 py-2 text-xs font-semibold text-white">Chat</a>
                <Link to="/contact" className="rounded-md border px-3 py-2 text-xs font-semibold">Request Quote</Link>
                <Link to="/book" className="rounded-md bg-navy px-3 py-2 text-xs font-semibold text-primary-foreground">Book Now</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
