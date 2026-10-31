import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Percent, MessageCircle, CalendarCheck, PartyPopper } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { WHATSAPP_URL } from "@/components/WhatsAppButton";

export const Route = createFileRoute("/refer")({
  head: () => ({
    meta: [
      { title: "Refer & Earn — Smart Ushering Kenya" },
      { name: "description", content: "Refer a friend to Smart Ushering and get 5% off your next booking. Share your referral code and earn every time they book." },
      { property: "og:title", content: "Refer & Earn — Smart Ushering Kenya" },
      { property: "og:description", content: "Refer a friend to Smart Ushering and get 5% off your next booking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://smartushering.lovable.app/refer" }],
  }),
  component: Page,
});

const STEPS = [
  { Icon: Gift, title: "1. Get your code", text: "Message us on WhatsApp with your name and phone number — we'll create a personal referral code for you, free." },
  { Icon: CalendarCheck, title: "2. Share it", text: "Send your code to friends, family or colleagues planning an event. They enter it on the booking form." },
  { Icon: Percent, title: "3. Earn 5% off", text: "The moment their booking is confirmed, you get 5% off your next Smart Ushering booking. No limits on how many people you refer." },
];

function Page() {
  return (
    <PublicLayout>
      <section className="gradient-navy py-14 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold"><PartyPopper className="h-4 w-4" /> Refer &amp; Earn</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Refer a friend. Save 5%.</h1>
          <p className="mt-3 max-w-2xl text-primary-foreground/80">Every time someone books Smart Ushering using your referral code, you earn 5% off your next booking — and they get our trusted, professional service.</p>
        </div>
      </section>

      <section className="bg-cream py-14">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-3">
          {STEPS.map(({ Icon, title, text }) => (
            <div key={title} className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-cream"><Icon className="h-5 w-5 text-gold" /></div>
              <h2 className="mt-4 font-display text-lg font-semibold text-navy">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-4xl rounded-2xl border bg-white p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold text-navy">Good to know</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• The 5% reward applies to your next confirmed booking after your referral's event is booked.</li>
            <li>• Referrals are tracked automatically — the referrer's name is recorded when their code is used.</li>
            <li>• You can refer as many people as you like; rewards add up one booking at a time.</li>
            <li>• Businesses and event planners can also request a partner code for repeat client referrals.</li>
          </ul>
        </div>

        <div className="mx-auto mt-10 flex max-w-4xl flex-col items-center gap-3 rounded-2xl bg-navy p-8 text-center text-primary-foreground">
          <h2 className="font-display text-2xl font-semibold text-gold">Get your referral code today</h2>
          <p className="text-sm text-primary-foreground/80">It takes less than a minute on WhatsApp.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md bg-[#25D366] px-6 py-3 text-sm font-semibold text-white"><MessageCircle className="h-4 w-4" /> Request a code on WhatsApp</a>
            <Link to="/book" className="rounded-md border border-primary-foreground/30 px-6 py-3 text-sm font-semibold hover:bg-white/10">Book an Event</Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
