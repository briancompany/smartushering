import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = ["All", "Weddings", "Conferences", "Corporate Events", "Graduations", "VIP Events", "Funerals", "Brand Activations"];

const q = queryOptions({
  queryKey: ["gallery"],
  queryFn: async () => (await supabase.from("gallery_images").select("*").order("display_order", { ascending: false })).data ?? [],
});

export const Route = createFileRoute("/gallery")({
  head: () => ({ meta: [{ title: "Gallery — Smart Ushering Kenya" }, { name: "description", content: "Photos from weddings, conferences, VIP events and more across Kenya." }], links: [{ rel: "canonical", href: "/gallery" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Page,
  errorComponent: ({ error }) => <div className="p-8">{error.message}</div>,
});

function Page() {
  const { data } = useSuspenseQuery(q);
  const [cat, setCat] = useState("All");
  const filtered = cat === "All" ? data : data.filter((i) => i.category === cat);
  return (
    <PublicLayout>
      <section className="gradient-navy py-14 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-bold sm:text-5xl">Gallery</h1>
          <p className="mt-3 text-primary-foreground/80">Moments from events across Kenya.</p>
        </div>
      </section>
      <section className="bg-cream py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`rounded-full px-4 py-1.5 text-xs font-semibold ${cat === c ? "bg-navy text-primary-foreground" : "bg-white text-foreground border"}`}>{c}</button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="mt-12 rounded-2xl border-2 border-dashed bg-white p-16 text-center text-muted-foreground">
              <p>No images yet for this category.</p>
              <p className="mt-1 text-xs">Admin can upload photos from the dashboard.</p>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((img) => (
                <figure key={img.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
                  <img src={img.image_url} alt={img.caption ?? img.category} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                  {img.caption && <figcaption className="p-3 text-xs text-muted-foreground">{img.caption}</figcaption>}
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
