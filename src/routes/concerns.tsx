import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PublicLayout } from "@/components/PublicLayout";
import { submitGrievance } from "@/lib/phase3.functions";

export const Route = createFileRoute("/concerns")({
  head: () => ({ meta: [
    { title: "Submit a Concern — Smart Ushering" },
    { name: "description", content: "Send a confidential complaint, grievance, or feedback. Submit anonymously if you prefer." },
  ] }),
  component: Page,
});

function Page() {
  const submit = useServerFn(submitGrievance);
  const [form, setForm] = useState({ subject: "", body: "", department: "", is_anonymous: false, public_name: "" });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submit({ data: form });
      setDone(true);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <PublicLayout>
      <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl font-semibold text-navy">Submit a concern</h1>
        <p className="mt-2 text-sm text-muted-foreground">Have a complaint, grievance, or suggestion? Let us know — you can submit anonymously.</p>
        {done ? (
          <div className="mt-8 rounded-xl border bg-white p-6">
            <h2 className="font-semibold text-navy">Thank you</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your submission has been received. The team will review it shortly.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-3 rounded-xl border bg-white p-6">
            <input required placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
            <textarea required placeholder="Tell us what happened…" rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
            <input placeholder="Department (optional)" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
            {!form.is_anonymous && (
              <input placeholder="Your name (optional)" value={form.public_name} onChange={(e) => setForm({ ...form, public_name: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
            )}
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={form.is_anonymous} onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })} />
              Submit anonymously
            </label>
            <button disabled={loading} className="w-full rounded-md bg-navy py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{loading ? "Submitting…" : "Submit"}</button>
          </form>
        )}
      </section>
    </PublicLayout>
  );
}
