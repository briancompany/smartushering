import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, User } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { supabase } from "@/integrations/supabase/client";

type Article = {
  slug: string; title: string; excerpt: string; body: string;
  author: string; published_at: string | null;
};

const guideQuery = (slug: string) =>
  queryOptions({
    queryKey: ["guide", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("slug, title, excerpt, body, author, published_at")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Guide not found");
      return data as Article;
    },
  });

export const Route = createFileRoute("/guides/$slug")({
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} — Smart Ushering` : "Guide — Smart Ushering" },
      { name: "description", content: loaderData?.excerpt ?? "Event planning guides from Smart Ushering Kenya." },
      { property: "og:title", content: loaderData ? `${loaderData.title} — Smart Ushering` : "Guide — Smart Ushering" },
      { property: "og:description", content: loaderData?.excerpt ?? "Event planning guides from Smart Ushering Kenya." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: loaderData ? [{ rel: "canonical", href: `https://smartushering.lovable.app/guides/${loaderData.slug}` }] : [],
  }),
  loader: ({ params, context }) => context.queryClient.ensureQueryData(guideQuery(params.slug)),
  component: Page,
  errorComponent: () => (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold text-navy">Guide not found</h1>
        <p className="mt-3 text-sm text-muted-foreground">This guide may have been moved or unpublished.</p>
        <Link to="/guides" className="mt-6 inline-block rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-primary-foreground">All guides</Link>
      </div>
    </PublicLayout>
  ),
});

function Page() {
  const guide = useSuspenseQuery(guideQuery(Route.useParams().slug)).data;
  const paragraphs = guide.body.split(/\n{2,}/).filter((p) => p.trim());
  return (
    <PublicLayout>
      <article className="bg-cream py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Link to="/guides" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy"><ArrowLeft className="h-4 w-4" /> All guides</Link>
          <h1 className="mt-4 font-display text-3xl font-semibold text-navy sm:text-4xl">{guide.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{guide.author}</span>
            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{guide.published_at ? new Date(guide.published_at).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : "Recent"}</span>
          </div>
          <p className="mt-6 rounded-xl border-l-4 border-gold bg-white p-4 text-sm italic text-muted-foreground">{guide.excerpt}</p>
          <div className="mt-6 space-y-5 rounded-2xl border bg-white p-6 sm:p-8">
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-line text-[15px] leading-7 text-foreground">{p}</p>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border bg-navy p-6 text-primary-foreground sm:p-8">
            <h2 className="font-display text-xl font-semibold text-gold">Need professional ushers?</h2>
            <p className="mt-2 text-sm text-primary-foreground/80">Trained, uniformed and punctual — for weddings, conferences, galas and government functions across Kenya.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/book" className="rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-gold-foreground hover:opacity-90">Book Your Event</Link>
              <Link to="/pricing" className="rounded-md border border-primary-foreground/30 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">See Pricing</Link>
            </div>
          </div>
        </div>
      </article>
    </PublicLayout>
  );
}
