import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminListQuotes, adminCreateQuote, adminGetQuoteUrl } from "@/lib/admin-phase2.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/quotes")({
  head: () => ({ meta: [{ title: "Quotes — Admin" }] }),
  component: Page,
});

function Page() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const list = useServerFn(adminListQuotes);
  const create = useServerFn(adminCreateQuote);
  const getUrl = useServerFn(adminGetQuoteUrl);
  const { data = [] } = useQuery({ queryKey: ["quotes", token], queryFn: () => list({ data: { token: token! } }), enabled: !!token });
  const { data: pkgs = [] } = useQuery({ queryKey: ["pkgs-q"], queryFn: async () => (await supabase.from("pricing_packages").select("*").order("display_order")).data ?? [] });
  const [form, setForm] = useState({ customer_name: "", customer_email: "", customer_phone: "", event_type: "Wedding", venue: "", county: "Nairobi", package_slug: "", number_of_ushers: 4, transport_rate_kes: 300, validity_days: 14, notes: "" });
  const [dates, setDates] = useState<string[]>([""]);
  if (!token) return null;
  if (!form.package_slug && pkgs[0]) setForm((f) => ({ ...f, package_slug: pkgs[0].slug }));

  const cleanDates = Array.from(new Set(dates.filter(Boolean))).sort();
  const days = Math.max(1, cleanDates.length);
  const pkg = pkgs.find((p) => p.slug === form.package_slug);
  const subtotal = (pkg?.price_kes ?? 0) * form.number_of_ushers * days;
  const transportTotal = form.transport_rate_kes * form.number_of_ushers * days;
  const total = subtotal + transportTotal;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await create({ data: { token, ...form, event_dates: cleanDates, number_of_days: days, event_date: cleanDates[0] ?? "" } });
      toast.success(`Quote ${r.reference} created`);
      qc.invalidateQueries({ queryKey: ["quotes"] });
      if (r.signedUrl) window.open(r.signedUrl, "_blank");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const openPdf = async (id: string) => {
    try { const { signedUrl } = await getUrl({ data: { token, id } }); if (signedUrl) window.open(signedUrl, "_blank"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Quotations</h1>

      <form onSubmit={submit} className="mt-6 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-3">
        <input required placeholder="Customer name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <input required type="email" placeholder="Customer email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <input placeholder="Phone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <input required placeholder="Event type" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <div className="sm:col-span-3 rounded-md border bg-cream/50 p-3">
          <div className="mb-2 text-xs font-semibold text-navy">Event dates — add one row per day the event runs ({days} day{days > 1 ? "s" : ""})</div>
          <div className="flex flex-wrap gap-2">
            {dates.map((d, i) => (
              <div key={i} className="flex items-center gap-1">
                <input type="date" value={d} onChange={(e) => setDates(dates.map((x, j) => (j === i ? e.target.value : x)))} className="rounded-md border px-3 py-2 text-sm" />
                {dates.length > 1 && <button type="button" onClick={() => setDates(dates.filter((_, j) => j !== i))} className="rounded border px-2 py-1 text-xs">✕</button>}
              </div>
            ))}
            <button type="button" onClick={() => setDates([...dates, ""])} className="rounded-md border border-navy px-3 py-2 text-xs font-semibold text-navy">+ Add day</button>
          </div>
        </div>
        <input placeholder="Venue" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <input placeholder="County" value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <select value={form.package_slug} onChange={(e) => setForm({ ...form, package_slug: e.target.value })} className="rounded-md border px-3 py-2 text-sm">
          {pkgs.map((p) => <option key={p.slug} value={p.slug}>{p.name} — KES {p.price_kes.toLocaleString()}</option>)}
        </select>
        <input type="number" min={1} placeholder="# ushers" value={form.number_of_ushers} onChange={(e) => setForm({ ...form, number_of_ushers: Number(e.target.value) })} className="rounded-md border px-3 py-2 text-sm" />
        <input type="number" min={0} placeholder="Transport KES" value={form.transport_kes} onChange={(e) => setForm({ ...form, transport_kes: Number(e.target.value) })} className="rounded-md border px-3 py-2 text-sm" />
        <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-md border px-3 py-2 text-sm sm:col-span-2" />
        <button className="rounded-md bg-navy py-2 text-sm font-semibold text-primary-foreground">Generate quote PDF</button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase text-muted-foreground"><tr>{["Ref","Customer","Event","Ushers","Total","Created",""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {data.map((q) => (
              <tr key={q.id} className="border-t">
                <td className="px-4 py-3 font-mono text-xs">{q.reference}</td>
                <td className="px-4 py-3">{q.customer_name}<div className="text-xs text-muted-foreground">{q.customer_email}</div></td>
                <td className="px-4 py-3">{q.event_type} <div className="text-xs text-muted-foreground">{q.event_date ?? "TBD"}</div></td>
                <td className="px-4 py-3">{q.number_of_ushers}</td>
                <td className="px-4 py-3 font-semibold">KES {q.total_kes.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs">{new Date(q.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3"><button onClick={() => openPdf(q.id)} className="rounded bg-navy px-3 py-1 text-xs text-primary-foreground">Open PDF</button></td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No quotes yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
