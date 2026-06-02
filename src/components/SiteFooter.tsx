import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="gradient-navy text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <div className="font-display text-2xl font-semibold text-gold">Smart Ushering</div>
          <p className="mt-3 text-sm text-primary-foreground/75">Every Guest Matters. Every Event Counts.</p>
          <p className="mt-4 text-sm text-primary-foreground/60">30+ trained professionals delivering premium hospitality across Kenya since 2024.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-gold">Quick Links</h4>
          <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
            <li><Link to="/services" className="hover:text-gold">Services</Link></li>
            <li><Link to="/pricing" className="hover:text-gold">Pricing</Link></li>
            <li><Link to="/book" className="hover:text-gold">Book Event</Link></li>
            <li><Link to="/gallery" className="hover:text-gold">Gallery</Link></li>
            <li><Link to="/faq" className="hover:text-gold">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-gold">Contact</h4>
          <ul className="mt-4 space-y-3 text-sm text-primary-foreground/80">
            <li className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 text-gold" /><a href="tel:+254112836281" className="hover:text-gold">0112 836 281</a></li>
            <li className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 text-gold" /><a href="mailto:ayietalensa@gmail.com" className="hover:text-gold break-all">ayietalensa@gmail.com</a></li>
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-gold" /><span>Nairobi, Kenya · Nationwide</span></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-gold">Get a Quote</h4>
          <p className="mt-4 text-sm text-primary-foreground/75">Tell us about your event and we'll respond within hours.</p>
          <Link to="/book" className="mt-4 inline-block rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-gold-foreground hover:opacity-90">Request Quote</Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-primary-foreground/60 sm:flex-row sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} Smart Ushering. All rights reserved.</span>
          <span>Nairobi, Kenya</span>
        </div>
      </div>
    </footer>
  );
}
