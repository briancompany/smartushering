import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, Phone, MapPin } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { WHATSAPP_URL } from "@/components/WhatsAppButton";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — Smart Ushering Kenya" }, { name: "description", content: "Get in touch with Smart Ushering: phone, WhatsApp and email." }], links: [{ rel: "canonical", href: "/contact" }] }),
  component: Page,
});

function Page() {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("contact_submissions").insert(form);
    if (error) { toast.error(error.message); return; }
    setSent(true);
    toast.success("Message sent!");
  };
  return (
    <PublicLayout>
      <section className="gradient-navy py-14 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-bold sm:text-5xl">Contact Us</h1>
          <p className="mt-3 text-primary-foreground/80">We respond within hours, every day.</p>
        </div>
      </section>
      <section className="bg-cream py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <div className="space-y-4">
            <div className="rounded-2xl border bg-white p-6">
              <h2 className="font-display text-xl font-semibold text-navy">Reach us directly</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex gap-3"><Phone className="h-5 w-5 text-gold" /><a href="tel:+254112836281" className="hover:text-navy">0112 836 281</a></li>
                <li className="flex gap-3"><Mail className="h-5 w-5 text-gold" /><a href="mailto:Smartushering@gmail.com" className="hover:text-navy break-all">Smartushering@gmail.com</a></li>
                <li className="flex gap-3"><MapPin className="h-5 w-5 text-gold" /><span>Nairobi, Kenya · Available Nationwide</span></li>
              </ul>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="mt-5 inline-block rounded-md bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white">Chat on WhatsApp</a>
            </div>
            <div className="overflow-hidden rounded-2xl border bg-white">
              <iframe title="Nairobi map" src="https://www.google.com/maps?q=Nairobi,Kenya&output=embed" className="h-64 w-full" loading="lazy" />
            </div>
          </div>
          <form onSubmit={submit} className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold text-navy">Send a message</h2>
            {sent ? (
              <p className="mt-4 rounded-md bg-gold/10 p-4 text-sm text-navy">Thank you. We'll respond shortly.</p>
            ) : (
              <div className="mt-4 grid gap-3">
                <input required placeholder="Full name" className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                <input required type="email" placeholder="Email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input placeholder="Phone" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <input placeholder="Subject" className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                <textarea required rows={5} placeholder="How can we help?" className="input" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                <button className="rounded-md bg-navy py-3 text-sm font-semibold text-primary-foreground">Send Message</button>
              </div>
            )}
          </form>
        </div>
      </section>
      <style>{`.input{width:100%;border:1px solid var(--color-border);border-radius:0.5rem;padding:0.625rem 0.75rem;font-size:0.875rem;background:white}`}</style>
    </PublicLayout>
  );
}
