import { MessageCircle } from "lucide-react";

const WA_URL = "https://wa.me/254112836281?text=" + encodeURIComponent("Hello Smart Ushering. I would like assistance with my event.");

export function WhatsAppButton() {
  return (
    <a
      href={WA_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-luxury transition-transform hover:scale-105"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}

export const WHATSAPP_URL = WA_URL;
