import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminAddGalleryImage, adminDeleteGalleryImage } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = ["Weddings", "Conferences", "Corporate Events", "Graduations", "VIP Events", "Funerals", "Brand Activations"];

export const Route = createFileRoute("/admin/gallery")({
  head: () => ({ meta: [{ title: "Gallery — Admin" }] }),
  component: Page,
});

function Page() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const add = useServerFn(adminAddGalleryImage);
  const del = useServerFn(adminDeleteGalleryImage);
  const { data } = useQuery({ queryKey: ["admin-gallery"], queryFn: async () => (await supabase.from("gallery_images").select("*").order("display_order", { ascending: false })).data ?? [] });
  const [form, setForm] = useState({ category: CATEGORIES[0], caption: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!token) return null;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-gallery"] }); qc.invalidateQueries({ queryKey: ["gallery"] }); };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Choose an image");
    setUploading(true);
    try {
      const path = `gallery/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("chat-uploads").upload(path, file);
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("chat-uploads").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (!signed) throw new Error("Failed to get URL");
      await add({ data: { token, category: form.category, image_url: signed.signedUrl, caption: form.caption || undefined, display_order: 0 } });
      toast.success("Uploaded");
      setFile(null); setForm({ ...form, caption: "" });
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setUploading(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this image?")) return;
    try { await del({ data: { token, id } }); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Gallery</h1>
      <form onSubmit={upload} className="mt-4 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-4">
        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-md border px-3 py-2 text-sm">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input placeholder="Caption (optional)" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
        <button disabled={uploading} className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{uploading ? "Uploading..." : "Upload"}</button>
      </form>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {data?.map((img) => (
          <div key={img.id} className="group relative overflow-hidden rounded-xl border bg-white">
            <img src={img.image_url} alt={img.caption ?? ""} className="aspect-square w-full object-cover" />
            <div className="p-2 text-xs">
              <div className="font-semibold text-navy">{img.category}</div>
              {img.caption && <div className="text-muted-foreground">{img.caption}</div>}
            </div>
            <button onClick={() => remove(img.id)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-md bg-rose-600 text-white opacity-0 transition-opacity group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {data?.length === 0 && <div className="col-span-full rounded-xl border-2 border-dashed p-12 text-center text-muted-foreground">No images yet.</div>}
      </div>
    </AdminLayout>
  );
}
