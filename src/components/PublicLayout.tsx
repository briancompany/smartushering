import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { WhatsAppButton } from "./WhatsAppButton";
import { ChatWidget } from "./ChatWidget";

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen min-w-0 w-full flex-col bg-background">
      <SiteHeader />
      <main className="min-w-0 w-full flex-1">{children}</main>
      <SiteFooter />
      <WhatsAppButton />
      <ChatWidget />
    </div>
  );
}
