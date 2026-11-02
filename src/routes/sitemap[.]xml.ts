import { createFileRoute } from "@tanstack/react-router";
import { createPublicClient } from "@/lib/public-client.server";

const BASE_URL = "https://smartushering.lovable.app";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const paths = ["/", "/services", "/pricing", "/book", "/gallery", "/reviews", "/guides", "/refer", "/track", "/faq", "/contact", "/concerns"];
        const locs = paths.map((p) => `  <url><loc>${BASE_URL}${p}</loc><changefreq>weekly</changefreq></url>`);

        // Published planning guides get their own shareable entries.
        try {
          const supabase = createPublicClient();
          const { data } = await supabase.from("articles").select("slug").eq("is_published", true).order("published_at", { ascending: false }).limit(100);
          for (const a of data ?? []) locs.push(`  <url><loc>${BASE_URL}/guides/${a.slug}</loc><changefreq>monthly</changefreq></url>`);
        } catch {
          // Sitemap still serves the static pages if guides are temporarily unavailable.
        }

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...locs,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
