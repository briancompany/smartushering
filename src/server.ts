import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// ---------------------------------------------------------------------------
// Security headers (applied to every response served by the Worker).
// Kept in one place so the policy is auditable. Origins listed here are the
// only third parties the app actually contacts:
//   - Supabase (REST, Auth, Storage, Realtime WebSocket)   *.supabase.co / wss
//   - Google Fonts CSS + font files                        fonts.googleapis.com / fonts.gstatic.com
//   - Cloudflare R2 public bucket (OG/hero images)         *.r2.dev
//   - Lovable preview/published hosts (og image + assets)  *.lovable.app
// WhatsApp (wa.me) and Google Maps are opened via top-level navigation, so
// they do not need CSP allowances.
// ---------------------------------------------------------------------------
const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' for scripts is required because TanStack Start streams
  // inline hydration <script> tags without a nonce; 'unsafe-eval' is NOT set.
  "script-src 'self' 'unsafe-inline'",
  // 'unsafe-inline' for styles is required for Tailwind/shadcn runtime styles
  // and React inline style props (e.g. Radix, charts).
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.supabase.co https://*.r2.dev https://*.lovable.app",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.lovable.app",
  "media-src 'self' blob: https://*.supabase.co",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CSP,
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": [
    "accelerometer=()",
    "autoplay=()",
    "camera=()",
    "display-capture=()",
    "encrypted-media=()",
    "fullscreen=(self)",
    "geolocation=()",
    "gyroscope=()",
    "magnetometer=()",
    "microphone=()",
    "midi=()",
    "payment=()",
    "picture-in-picture=()",
    "publickey-credentials-get=()",
    "screen-wake-lock=()",
    "sync-xhr=()",
    "usb=()",
    "xr-spatial-tracking=()",
  ].join(", "),
  // Isolates the browsing context from cross-origin popups (safe default).
  "Cross-Origin-Opener-Policy": "same-origin",
  // Allows same-site subresources (Supabase / R2 / Google Fonts) to load us
  // as needed while blocking arbitrary cross-origin embedders.
  "Cross-Origin-Resource-Policy": "same-site",
  // NOTE: Cross-Origin-Embedder-Policy is intentionally OMITTED. Enabling
  // 'require-corp' would break Supabase Storage images, Google Fonts, and
  // Cloudflare R2 assets (they do not send CORP headers), producing blank
  // images and broken PDFs. Skipping COEP is the standard trade-off.
};

function applySecurityHeaders(response: Response): Response {
  // Don't mutate immutable responses (some Worker responses are frozen).
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return applySecurityHeaders(normalized);
    } catch (error) {
      console.error(error);
      return applySecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
