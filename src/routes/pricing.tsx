import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { supabase } from "@/integrations/supabase/client";

const q = queryOptions({
  queryKey: ["pricing"],
  queryFn: async () => {
    const [pkgs, settings] = await Promise.all([
      supabase.from("pricing_packages").select("*").order("display_order"),
      supabase.from("site_settings").select("*").in("key", ["transport_nairobi_kes"]),
    ]);
    return { packages: pkgs.data ?? [], transport: settings.data?.find((s) => s.key === "transport_nairobi_kes")?.value ?? "200" };
  },
});

export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Pricing — Smart Ushering Kenya" }, { name: "description", content: "Transparent per-usher pricing for weddings, corporate and VIP events across Kenya." }], links: [{ rel: "canonical", href: "/pricing" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Page,
  errorComponent: ({ error }) => <div className="p-8">Couldn't load: {error.message}</div>,
});

function Page() {
  const { data } = useSuspenseQuery(q);
  return (
    <PublicLayout>
      <section className="gradient-navy py-16 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Pricing</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Simple, transparent rates</h1>
          <p className="mt-4 text-primary-foreground/80">All prices are per usher per event.</p>
        </div>
      </section>
      <section className="bg-cream py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3 sm:px-6 lg:px-8">
          {data.packages.map((p, i) => (
            <div key={p.id} className={`rounded-2xl border bg-white p-8 shadow-sm ${i === 2 ? "border-gold shadow-luxury" : ""}`}>
              {i === 2 && <span className="mb-3 inline-block rounded-full bg-gold px-3 py-1 text-xs font-semibold text-gold-foreground">Premium</span>}
              <h2 className="font-display text-xl font-semibold text-navy">{p.name}</h2>
              <div className="mt-4">
                <span className="font-display text-4xl font-bold text-navy">KES {p.price_kes.toLocaleString()}</span>
                <span className="ml-2 text-sm text-muted-foreground">/ usher</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>
              <ul className="mt-6 space-y-2 text-sm">
                {(p.features as string[]).map((f) => (
                  <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-gold" />{f}</li>
                ))}
              </ul>
              <Link to="/book" className="mt-8 block rounded-md bg-navy py-3 text-center text-sm font-semibold text-primary-foreground hover:opacity-90">Book this package</Link>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-12 max-w-4xl rounded-2xl border bg-white p-8">
          <h3 className="font-display text-lg font-semibold text-navy">Additional Charges</h3>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>• KES {data.transport} transport per usher within Nairobi (paid by host)</li>
            <li>• Outside Nairobi: transport agreed during booking (paid by host)</li>
            <li>• Host provides lunch for all ushers</li>
            <li>• Host specifies number of ushers required</li>
          </ul>
        </div>
      </section>
    </PublicLayout>
  );
}
