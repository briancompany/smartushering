import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { submitTicket } from "@/lib/tickets.functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [
    { title: "Forgot Password — Smart Ushering" },
    { name: "description", content: "Open a support ticket to reset your Smart Ushering staff account password." },
    { name: "robots", content: "noindex" },
  ] }),
  component: Page,
  errorComponent: () => <div className="p-8 text-center">Something went wrong. <Link to="/admin/login" className="text-navy underline">Back to sign in</Link></div>,
  notFoundComponent: () => <div className="p-8 text-center">Page not found.</div>,
});

const CATEGORIES = [
  { value: "forgot_password", label: "Forgot password" },
  { value: "account_help", label: "Account help / locked out" },
  { value: "bug_report", label: "Bug report" },
  { value: "feature_request", label: "Feature request" },
  { value: "complaint", label: "Complaint" },
  { value: "general", label: "General question" },
  { value: "other", label: "Other" },
] as const;

function Page() {
  const submit = useServerFn(submitTicket);
  const [form, setForm] = useState({
    category: "forgot_password" as typeof CATEGORIES[number]["value"],
    subject: "Password reset request",
    details: "",
    submitter_name: "",
    submitter_username: "",
    submitter_phone: "",
    submitter_email: "",
  });
  const [loading, setLoading] = useState(false);
  const [ticketNo, setTicketNo] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await submit({ data: { ...form, is_staff: true, priority: form.category === "forgot_password" ? "high" : "normal" } });
      setTicketNo(res.ticket_no);
      toast.success("Ticket submitted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setLoading(false); }
  };

  if (ticketNo) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream px-4">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-luxury">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="mt-4 font-display text-2xl font-semibold text-navy">Ticket submitted</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your reference number is</p>
          <p className="mt-1 font-mono text-lg font-semibold text-navy">{ticketNo}</p>
          <p className="mt-4 text-sm text-muted-foreground">An admin will contact you on WhatsApp at <strong>{form.submitter_phone}</strong> with your new password. Keep this number handy.</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/track-ticket" className="rounded-md border border-navy px-6 py-2 text-sm font-semibold text-navy">Track ticket</Link>
            <Link to="/admin/login" className="rounded-md bg-navy px-6 py-2 text-sm font-semibold text-primary-foreground">Back to sign in</Link>
          </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-cream px-4 py-8">
      <div className="w-full max-w-lg">
        <Link to="/admin/login" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
        <div className="rounded-2xl border bg-white p-6 shadow-luxury sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-navy">Support ticket</h1>
          <p className="mt-1 text-sm text-muted-foreground">Forgot password, locked out, or need help? Open a ticket and an admin will get back to you on WhatsApp.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <label className="block text-xs font-semibold uppercase text-muted-foreground">Category
              <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category, subject: e.target.value === "forgot_password" ? "Password reset request" : form.subject })} className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-normal normal-case text-foreground">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <input required maxLength={160} placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input required maxLength={120} placeholder="Full name" value={form.submitter_name} onChange={(e) => setForm({ ...form, submitter_name: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
              <input maxLength={60} placeholder="Username or Staff ID" value={form.submitter_username} onChange={(e) => setForm({ ...form, submitter_username: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
              <input required maxLength={20} placeholder="WhatsApp phone (e.g. 0712345678)" value={form.submitter_phone} onChange={(e) => setForm({ ...form, submitter_phone: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
              <input type="email" maxLength={160} placeholder="Email (optional)" value={form.submitter_email} onChange={(e) => setForm({ ...form, submitter_email: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
            </div>
            <textarea maxLength={4000} rows={4} placeholder="Additional details (optional)" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
            <button disabled={loading} className="w-full rounded-md bg-navy py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{loading ? "Submitting..." : "Submit ticket"}</button>
            <p className="text-xs text-muted-foreground">Rate limited to 5 tickets per hour per phone number.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
