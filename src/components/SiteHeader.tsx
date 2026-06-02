import { Link } from "@tanstack/react-router";
import { Menu, X, Phone } from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/services", label: "Services" },
  { to: "/pricing", label: "Pricing" },
  { to: "/gallery", label: "Gallery" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-navy">
            <span className="font-display text-lg font-bold text-gold">S</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold text-navy">Smart Ushering</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-gold">Every Guest Matters</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-navy"
              activeProps={{ className: "text-navy" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a href="tel:+254112836281" className="flex items-center gap-2 text-sm font-medium text-navy">
            <Phone className="h-4 w-4 text-gold" /> 0112 836 281
          </a>
          <Link to="/book" className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Book Event
          </Link>
        </div>

        <button className="lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-cream" activeProps={{ className: "bg-cream text-navy" }}>
                {n.label}
              </Link>
            ))}
            <Link to="/book" onClick={() => setOpen(false)} className="mt-2 rounded-md bg-navy px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground">
              Book Event
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
