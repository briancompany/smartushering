import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { BookOpen, ArrowRight, CalendarDays } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { supabase } from "@/integrations/supabase/client";

type GuideRow = { slug: string; title: string; excerpt: string; author: string; published_at: string | null };

const q = queryOptions({
  queryKey: ["guides"],
  queryFn: async () => {
    const { data } = await supabase
      .from("articles")
      .select("slug, title, excerpt, author, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false });
    return (data ?? []) as GuideRow[];
  },
});

export const Route = createFileRoute("/guides")({
  head: () => ({
    meta: [
      { title: "Event Planning Guides — Smart Ushering Kenya" },
      { name: "description", content: "Free planning guides: how many ushers you need, wedding ushering checklists and event day timelines from Nairobi's ushering experts." },
      { property: "og:title", content: "Event Planning Guides — Smart Ushering Kenya" },
      { property: "og:description", content: "Free planning guides from Nairobi's ushering experts — usher counts, checklists and event day timelines." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://smartushering.lovable.app/guides" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Page,
  errorComponent: ({ error }) => <div className="p-8">Couldn't load guides: {error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8 text-center">No guides published yet.</div>,
});

function Page() {
  const { data: guides } = useSuspenseQuery(q);
  return (
    <PublicLayout>
      <section className="gradient-navy py-14 text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Planning Guides</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Plan your event with confidence</h1>
          <p className="mt-3 max-w-2xl text-primary-foreground/80">Practical guides from our team — how many ushers you need, what to prepare, and how the day should run.</p>
        </div>
      </section>
      <section className="bg-cream py-14">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
          {guides.length === 0 && <p className="text-muted-foreground">Guides are coming soon. Meanwhile, call us on 0112 836 281 for advice.</p>}
          {guides.map((g) => (
            <Link key={g.slug} to="/guides/$slug" params={{ slug: g.slug }} className="group flex min-w-0 flex-col rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-luxury">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-cream"><BookOpen className="h-5 w-5 text-gold" /></div>
              <h2 className="mt-4 font-display text-lg font-semibold text-navy">{g.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{g.excerpt}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{g.published_at ? new Date(g.published_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "Recent"}</span>
                <span className="flex items-center gap-1 font-semibold text-navy">Read <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
              </div>
            </Link>
          ))}
        </div>
        <div className="mx-auto mt-10 max-w-6xl rounded-2xl border bg-white p-6 text-center sm:p-8">
          <h2 className="font-display text-xl font-semibold text-navy">Ready to book your ushers?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Get an instant estimate and we'll confirm availability within hours.</p>
          <Link to="/book" className="mt-5 inline-block rounded-md bg-navy px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">Book Your Event</Link>
        </div>
      </section>
    </PublicLayout>
  );
}
