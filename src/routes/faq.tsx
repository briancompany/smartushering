import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { PublicLayout } from "@/components/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const q = queryOptions({
  queryKey: ["faqs"],
  queryFn: async () => (await supabase.from("faqs").select("*").eq("is_active", true).order("display_order")).data ?? [],
});

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: "FAQ — Smart Ushering Kenya" }, { name: "description", content: "Answers to common questions about our ushering services." }], links: [{ rel: "canonical", href: "/faq" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(q),
  component: Page,
  errorComponent: ({ error }) => <div className="p-8">{error.message}</div>,
});

function Page() {
  const { data } = useSuspenseQuery(q);
  return (
    <PublicLayout>
      <section className="gradient-navy py-14 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-bold sm:text-5xl">Frequently Asked Questions</h1>
        </div>
      </section>
      <section className="bg-cream py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Accordion type="single" collapsible className="space-y-3">
            {data.map((f) => (
              <AccordionItem key={f.id} value={f.id} className="rounded-xl border bg-white px-4">
                <AccordionTrigger className="font-display text-base font-semibold text-navy">{f.question}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </PublicLayout>
  );
}
