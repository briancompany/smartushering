import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Download, MessageCircle, Phone } from "lucide-react";
import { getQuoteByReference } from "@/lib/admin-phase2.functions";

export const Route = createFileRoute("/quote/$reference")({
  head: () => ({ meta: [{ title: "Your Quotation — Smart Ushering" }] }),
  component: Page,
});

function Page() {
  const { reference } = Route.useParams();
  const fetch = useServerFn(getQuoteByReference);
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof fetch>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch({ data: { reference } })
      .then(setQuote)
      .catch(() => setError("Quote not found. Please check the link or contact us."))
      .finally(() => setLoading(false));
  }, [reference]);

  const download = async () => {
    if (!quote?.pdfUrl) return;
    try {
      const res = await window.fetch(quote.pdfUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SmartUshering-${quote.reference}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(quote.pdfUrl, "_blank");
    }
  };

  const waMessage = quote
    ? encodeURIComponent(`Hi Smart Ushering, I'm reaching out regarding my quotation ${quote.reference}. `)
    : "";
  const waUrl = `https://wa.me/254112836281?text=${waMessage}`;

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-navy border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading your quotation...</p>
      </div>
    </div>
  );

  if (error || !quote) return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow">
        <img src="/icon-512.png" alt="Smart Ushering" width={48} className="mx-auto mb-4 rounded-lg" />
        <h1 className="font-display text-xl font-semibold text-navy">Quote Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <a href="tel:+254112836281" className="mt-4 inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white">
          <Phone className="h-4 w-4" /> Call Us
        </a>
      </div>
    </div>
  );

  const perDay = (Array.isArray(quote.date_ushers) ? quote.date_ushers : []) as Array<{ date: string; ushers: number }>;
  const days = quote.number_of_days ?? 1;
  const dates = quote.event_dates?.length ? quote.event_dates.join(", ") : (quote.event_date ?? "TBD");
  const usherDays = perDay.length ? perDay.reduce((s, e) => s + e.ushers, 0) : quote.number_of_ushers * days;
  const subtotal = quote.subtotal_kes ?? (quote.package_price_kes * usherDays);
  const transport = quote.transport_kes ?? 0;
  const total = quote.total_kes ?? (subtotal + transport);
  const isExpired = quote.valid_until ? new Date(quote.valid_until) < new Date() : false;


  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <img src="/icon-512.png" alt="Smart Ushering" width={48} className="rounded-lg" />
          <div>
            <div className="font-display text-xl font-bold text-navy">Smart Ushering</div>
            <div className="text-xs text-muted-foreground">Every Guest Matters. Every Event Counts.</div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm">
          {/* Title bar */}
          <div className="rounded-t-2xl bg-navy px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display text-2xl font-bold text-gold">QUOTATION</div>
                <div className="mt-1 text-sm text-white/70">Ref: {quote.reference}</div>
              </div>
              <div className="text-right text-xs text-white/70">
                <div>Issued: {new Date(quote.created_at).toLocaleDateString("en-KE")}</div>
                {quote.valid_until && (
                  <div className={isExpired ? "text-red-400" : "text-white/70"}>
                    {isExpired ? "Expired" : "Valid until"}: {new Date(quote.valid_until).toLocaleDateString("en-KE")}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Customer */}
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Prepared for</div>
              <div className="font-display text-lg font-semibold text-navy">{quote.customer_name}</div>
            </div>

            {/* Event details */}
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-cream p-4 text-sm">
              {[
                ["Event Type", quote.event_type],
                [days > 1 ? "Event Dates" : "Event Date", dates],
                ["Duration", `${days} day${days > 1 ? "s" : ""}`],
                ["Venue", quote.venue ?? "TBD"],
                ["County", quote.county ?? "TBD"],
                ["Package", quote.package_name],
                ["No. of Ushers", perDay.length
                  ? (Math.min(...perDay.map((e) => e.ushers)) === Math.max(...perDay.map((e) => e.ushers))
                      ? `${quote.number_of_ushers} per day`
                      : `${Math.min(...perDay.map((e) => e.ushers))}–${Math.max(...perDay.map((e) => e.ushers))} per day (${usherDays} usher-days)`)
                  : String(quote.number_of_ushers)],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className="font-semibold text-navy">{v}</div>
                </div>
              ))}
            </div>

            {/* Cost breakdown */}
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Cost Breakdown</div>
              <div className="divide-y rounded-xl border">
                {perDay.map((e, i) => (
                  <div key={e.date} className="flex justify-between px-4 py-3 text-sm">
                    <div>
                      <div className="font-semibold text-navy">Day {i + 1} — {e.date}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.ushers} usher{e.ushers > 1 ? "s" : ""} × KES {(quote.package_price_kes + (quote.transport_rate_kes ?? 0)).toLocaleString()} (ushering + transport, per usher/day)
                      </div>
                    </div>
                    <div className="font-semibold text-navy">
                      KES {(e.ushers * (quote.package_price_kes + (quote.transport_rate_kes ?? 0))).toLocaleString()}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-3 text-sm">
                  <div>
                    <div className="font-semibold text-navy">{quote.package_name} package</div>
                    <div className="text-xs text-muted-foreground">
                      KES {quote.package_price_kes.toLocaleString()} × {usherDays} usher-day{usherDays > 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="font-semibold text-navy">KES {subtotal.toLocaleString()}</div>
                </div>
                <div className="flex justify-between px-4 py-3 text-sm">
                  <div>
                    <div className="font-semibold text-navy">Transport allowance</div>
                    <div className="text-xs text-muted-foreground">
                      KES {(quote.transport_rate_kes ?? 0).toLocaleString()} × {usherDays} usher-day{usherDays > 1 ? "s" : ""}
                    </div>
                  </div>

                  <div className="font-semibold text-navy">KES {transport.toLocaleString()}</div>
                </div>
                <div className="flex justify-between rounded-b-xl bg-navy px-4 py-3">
                  <div className="font-display text-lg font-bold text-white">Total</div>
                  <div className="font-display text-lg font-bold text-gold">KES {total.toLocaleString()}</div>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">* Host provides lunch for all ushers. Transport billed separately.</p>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div className="rounded-xl bg-cream p-4 text-sm">
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Notes</div>
                <p className="text-navy">{quote.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2">
              {quote.pdfUrl && (
                <button
                  onClick={download}
                  className="flex items-center justify-center gap-2 rounded-md bg-navy py-3 text-sm font-semibold text-white"
                >
                  <Download className="h-4 w-4" /> Download PDF Quote
                </button>
              )}
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-md bg-[#25D366] py-3 text-sm font-semibold text-white"
              >
                <MessageCircle className="h-4 w-4" /> Chat with us on WhatsApp
              </a>
              <a
                href="tel:+254112836281"
                className="flex items-center justify-center gap-2 rounded-md border py-3 text-sm font-semibold text-navy"
              >
                <Phone className="h-4 w-4" /> Call 0112 836 281
              </a>
            </div>

            {/* Footer */}
            <div className="border-t pt-4 text-center text-xs text-muted-foreground">
              Smart Ushering • Nairobi, Kenya • Smartushering@gmail.com • 0112 836 281
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
