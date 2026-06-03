import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-navy">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-navy px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-navy px-5 py-2.5 text-sm text-primary-foreground hover:opacity-90">Try again</button>
          <a href="/" className="rounded-md border px-5 py-2.5 text-sm hover:bg-accent">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Smart Ushering — Professional Ushering Services in Kenya" },
      { name: "description", content: "Premium ushering, guest management and event support across Kenya. 30+ trained professionals for weddings, corporate events and VIP functions." },
      { name: "author", content: "Smart Ushering" },
      { name: "keywords", content: "ushering services Kenya, event ushers Nairobi, wedding ushers, corporate ushers, VIP guest management, protocol assistance" },
      { property: "og:title", content: "Smart Ushering — Professional Ushering Services in Kenya" },
      { property: "og:description", content: "Premium ushering, guest management and event support across Kenya. 30+ trained professionals for weddings, corporate events and VIP functions." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_KE" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Smart Ushering — Professional Ushering Services in Kenya" },
      { name: "twitter:description", content: "Premium ushering, guest management and event support across Kenya. 30+ trained professionals for weddings, corporate events and VIP functions." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/897b5d4f-1704-4664-ba9f-085aec938b7f/id-preview-c914e1b1--a069dc2c-9ad1-4b43-8196-ef063517468d.lovable.app-1780390919370.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/897b5d4f-1704-4664-ba9f-085aec938b7f/id-preview-c914e1b1--a069dc2c-9ad1-4b43-8196-ef063517468d.lovable.app-1780390919370.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "Smart Ushering",
          image: "/og-image.jpg",
          telephone: "+254112836281",
          email: "Smartushering@gmail.com",
          address: { "@type": "PostalAddress", addressLocality: "Nairobi", addressCountry: "KE" },
          areaServed: "Kenya",
          slogan: "Every Guest Matters. Every Event Counts.",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
