import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, Save } from "lucide-react";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { RateCardPreview } from "@/components/RateCardPreview";
import { Button } from "@/components/ui/button";
import { adminUpdatePricing, adminUpdateSetting } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/pricing")({
  head: () => ({ meta: [
    { title: "Pricing & Rate Cards — Smart Ushering Admin" },
    { name: "description", content: "Manage Smart Ushering package prices and download the current branded rate card." },
    { property: "og:title", content: "Pricing & Rate Cards — Smart Ushering Admin" },
    { property: "og:description", content: "Manage Smart Ushering package prices and download the current branded rate card." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

function Page() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const updatePrice = useServerFn(adminUpdatePricing);
  const updateSetting = useServerFn(adminUpdateSetting);
  const { data } = useQuery({
    queryKey: ["admin-pricing"],
    queryFn: async () => {
      const [pkgs, settings] = await Promise.all([
        supabase.from("pricing_packages").select("*").order("display_order"),
        supabase.from("site_settings").select("*"),
      ]);
      return { packages: pkgs.data ?? [], settings: settings.data ?? [] };
    },
  });
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [transport, setTransport] = useState("200");
  const [showRateCard, setShowRateCard] = useState(false);

  useEffect(() => {
    if (!data) return;
    setPrices(Object.fromEntries(data.packages.map((p) => [p.id, p.price_kes])));
    setTransport(data.settings.find((s) => s.key === "transport_nairobi_kes")?.value ?? "200");
  }, [data]);

  if (!token || !data) return <AdminLayout><div>Loading...</div></AdminLayout>;

  const saveAll = async () => {
    try {
      await Promise.all([
        ...data.packages.map((p) => updatePrice({ data: { token, id: p.id, price_kes: prices[p.id] ?? p.price_kes } })),
        updateSetting({ data: { token, key: "transport_nairobi_kes", value: transport } }),
      ]);
      toast.success("Pricing updated. Changes reflect site-wide.");
      await qc.invalidateQueries({ queryKey: ["admin-pricing"] });
      qc.invalidateQueries({ queryKey: ["pricing"] });
      qc.invalidateQueries({ queryKey: ["book-data"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <AdminLayout>
      {showRateCard && (
        <RateCardPreview
          packages={data.packages.map((p) => ({ ...p, price_kes: prices[p.id] ?? p.price_kes }))}
          transport={transport}
          onClose={() => setShowRateCard(false)}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-navy">Pricing Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Update package rates, then preview or download the current rate card.</p>
        </div>
        <Button variant="outline" onClick={() => setShowRateCard(true)}><Eye /> Preview rate card</Button>
      </div>
      <div className="mt-6 space-y-4">
        {data.packages.map((p) => (
          <div key={p.id} className="rounded-xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display text-lg font-semibold text-navy">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">KES</span>
                <input type="number" value={prices[p.id] ?? ""} onChange={(e) => setPrices({ ...prices, [p.id]: Number(e.target.value) })} className="w-32 rounded-md border px-3 py-2 text-sm" />
                <span className="text-xs text-muted-foreground">/ usher</span>
              </div>
            </div>
          </div>
        ))}
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-lg font-semibold text-navy">Transport — Nairobi</div>
              <div className="text-xs text-muted-foreground">Per usher within Nairobi</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">KES</span>
              <input type="number" value={transport} onChange={(e) => setTransport(e.target.value)} className="w-32 rounded-md border px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={saveAll} size="lg"><Save /> Save all changes</Button>
          <Button variant="outline" onClick={() => setShowRateCard(true)} size="lg"><Eye /> Preview & download</Button>
        </div>
      </div>
    </AdminLayout>
  );
}
