import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminUpsertFaq, adminDeleteFaq } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/faqs")({
  head: () => ({ meta: [{ title: "FAQs — Admin" }] }),
  component: Page,
});

function Page() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const upsert = useServerFn(adminUpsertFaq);
  const del = useServerFn(adminDeleteFaq);
  const { data } = useQuery({ queryKey: ["admin-faqs"], queryFn: async () => (await supabase.from("faqs").select("*").order("display_order")).data ?? [] });
  const [editing, setEditing] = useState<{ id?: string; question: string; answer: string; display_order: number; is_active: boolean } | null>(null);

  if (!token) return null;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-faqs"] }); qc.invalidateQueries({ queryKey: ["faqs"] }); };

  const save = async () => {
    if (!editing) return;
    try { await upsert({ data: { token, ...editing } }); toast.success("Saved"); setEditing(null); refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold text-navy">FAQs</h1>
        <button onClick={() => setEditing({ question: "", answer: "", display_order: 0, is_active: true })} className="inline-flex items-center gap-1 rounded-md bg-navy px-4 py-2 text-sm text-primary-foreground"><Plus className="h-4 w-4" /> Add</button>
      </div>
      <div className="mt-6 space-y-2">
        {data?.map((f) => (
          <div key={f.id} className="rounded-xl border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-navy">{f.question}</div>
                <p className="mt-1 text-sm text-muted-foreground">{f.answer}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing({ id: f.id, question: f.question, answer: f.answer, display_order: f.display_order, is_active: f.is_active })} className="rounded border px-2 py-1 text-xs">Edit</button>
                <button onClick={async () => { if (!confirm("Delete?")) return; await del({ data: { token, id: f.id } }); refresh(); }} className="rounded bg-rose-600 px-2 py-1 text-xs text-white"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-xl font-semibold text-navy">{editing.id ? "Edit" : "New"} FAQ</h2>
            <div className="mt-4 space-y-3">
              <input placeholder="Question" value={editing.question} onChange={(e) => setEditing({ ...editing, question: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
              <textarea placeholder="Answer" rows={4} value={editing.answer} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm" />
              <input type="number" value={editing.display_order} onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) })} className="w-full rounded-md border px-3 py-2 text-sm" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active</label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
              <button onClick={save} className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground">Save</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
