import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Search, ArrowLeft } from "lucide-react";
import { publicTrackTicket } from "@/lib/tickets.functions";

export const Route = createFileRoute("/track-ticket")({
  head: () => ({ meta: [
    { title: "Track your ticket — Smart Ushering" },
    { name: "description", content: "Check the status of a support ticket you submitted to Smart Ushering." },
  ] }),
  component: Page,
});

type TicketResult = {
  ticket_no: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  admin_response: string | null;
  resolved_at: string | null;
  created_at: string;
};

function Page() {
  const track = useServerFn(publicTrackTicket);
  const [form, setForm] = useState({ ticket_no: "", phone: "" });
  const [result, setResult] = useState<TicketResult | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await track({ data: form });
      setResult(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Not found");
      setResult(null);
    } finally { setLoading(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-cream px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy"><ArrowLeft className="h-4 w-4" /> Home</Link>
        <div className="rounded-2xl border bg-white p-6 shadow-luxury">
          <h1 className="font-display text-2xl font-semibold text-navy">Track your ticket</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter the ticket number and the phone you used.</p>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <input required placeholder="Ticket number e.g. TCK-000042" value={form.ticket_no} onChange={(e) => setForm({ ...form, ticket_no: e.target.value.toUpperCase() })} className="w-full rounded-md border px-3 py-2.5 font-mono text-sm" />
            <input required placeholder="Phone used to submit" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-md border px-3 py-2.5 text-sm" />
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-navy py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              <Search className="h-4 w-4" /> {loading ? "Searching…" : "Track ticket"}
            </button>
          </form>

          {result && (
            <div className="mt-6 rounded-lg border bg-cream p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`rounded-full px-2 py-0.5 font-semibold uppercase ${result.status === "resolved" || result.status === "closed" ? "bg-emerald-100 text-emerald-700" : result.status === "in_progress" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-700"}`}>{result.status.replace("_"," ")}</span>
                <span>{new Date(result.created_at).toLocaleString()}</span>
              </div>
              <h3 className="mt-2 font-semibold text-navy">{result.subject}</h3>
              <p className="mt-1 text-xs capitalize text-muted-foreground">{result.category.replace("_"," ")} • {result.priority} priority</p>
              {result.admin_response ? (
                <div className="mt-3 rounded-md bg-white p-3 text-sm">
                  <div className="text-xs font-semibold text-navy">Admin response</div>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{result.admin_response}</p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">Awaiting admin response.</p>
              )}
              {result.resolved_at && <p className="mt-2 text-xs text-emerald-700">Resolved {new Date(result.resolved_at).toLocaleString()}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
