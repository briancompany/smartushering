import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, Plus, Megaphone, Users, Ticket, CalendarOff, Package, Gift, Newspaper, Check, X } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import {
  adminListLeads, adminDeleteLead,
  adminListCallbacks, adminUpdateCallback, adminDeleteCallback,
  adminListPromoCodes, adminUpsertPromoCode, adminDeletePromoCode,
  adminListBlockedDates, adminAddBlockedDate, adminDeleteBlockedDate,
  adminListAddOns, adminUpsertAddOn, adminDeleteAddOn,
  adminListReferrals, adminUpsertReferral, adminUpdateReferralReward, adminDeleteReferral,
  adminListArticles, adminUpsertArticle, adminDeleteArticle,
} from "@/lib/growth.functions";

export const Route = createFileRoute("/admin/growth")({
  head: () => ({ meta: [{ title: "Growth — Admin — Smart Ushering" },
    { name: "description", content: "Manage leads, callbacks, promo codes, add-ons, referrals and planning guides." },
    { property: "og:title", content: "Growth — Admin — Smart Ushering" },
    { property: "og:description", content: "Manage leads, callbacks, promo codes, add-ons, referrals and planning guides." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Page,
});

type Tab = "leads" | "callbacks" | "promos" | "closed" | "addons" | "referrals" | "articles";

const TABS: { id: Tab; label: string; Icon: typeof Megaphone }[] = [
  { id: "leads", label: "Rate Card Leads", Icon: Megaphone },
  { id: "callbacks", label: "Callback Requests", Icon: Users },
  { id: "promos", label: "Promo Codes", Icon: Ticket },
  { id: "closed", label: "Closed Dates", Icon: CalendarOff },
  { id: "addons", label: "Booking Add-ons", Icon: Package },
  { id: "referrals", label: "Referrals", Icon: Gift },
  { id: "articles", label: "Planning Guides", Icon: Newspaper },
];

function Page() {
  const token = useAdminToken();
  const [tab, setTab] = useState<Tab>("leads");
  if (!token) return null;

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Growth</h1>
      <p className="text-sm text-muted-foreground">Leads, promo codes, add-ons, referrals and planning guides that bring in new business.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold ${tab === id ? "bg-navy text-primary-foreground" : "border bg-white text-foreground hover:border-navy"}`}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "leads" && <Leads token={token} />}
        {tab === "callbacks" && <Callbacks token={token} />}
        {tab === "promos" && <Promos token={token} />}
        {tab === "closed" && <ClosedDates token={token} />}
        {tab === "addons" && <AddOns token={token} />}
        {tab === "referrals" && <Referrals token={token} />}
        {tab === "articles" && <Articles token={token} />}
      </div>
    </AdminLayout>
  );
}

const card = "rounded-xl border bg-white p-4";
const inputCls = "input w-full min-w-0";
const btnPrimary = "inline-flex items-center gap-1 rounded-md bg-navy px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90";
const btnDanger = "inline-flex items-center gap-1 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground";

/* ---------- Leads ---------- */
function Leads({ token }: { token: string }) {
  const list = useServerFn(adminListLeads);
  const del = useServerFn(adminDeleteLead);
  const { data = [], refetch } = useQuery({ queryKey: ["growth-leads"], queryFn: () => list({ data: { token } }), staleTime: 30_000 });
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Visitors who asked for the full rate card — call or WhatsApp them.</p>
      {data.length === 0 && <p className="text-sm text-muted-foreground">No leads yet.</p>}
      {data.map((l: { id: string; full_name: string; phone: string; email: string | null; source: string; created_at: string }) => (
        <div key={l.id} className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-navy">{l.full_name}</div>
              <div className="text-xs text-muted-foreground">{l.phone}{l.email ? ` · ${l.email}` : ""} · {l.source} · {new Date(l.created_at).toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">WhatsApp</a>
              <button onClick={async () => { if (confirm("Delete this lead?")) { await del({ data: { token, id: l.id } }); refetch(); } }} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Callbacks ---------- */
function Callbacks({ token }: { token: string }) {
  const list = useServerFn(adminListCallbacks);
  const update = useServerFn(adminUpdateCallback);
  const del = useServerFn(adminDeleteCallback);
  const { data = [], refetch } = useQuery({ queryKey: ["growth-callbacks"], queryFn: () => list({ data: { token } }), staleTime: 30_000 });
  return (
    <div className="space-y-3">
      {data.length === 0 && <p className="text-sm text-muted-foreground">No callback requests yet.</p>}
      {data.map((c: { id: string; full_name: string; phone: string; preferred_time: string | null; notes: string | null; status: string; created_at: string }) => (
        <div key={c.id} className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-navy">{c.full_name}</div>
              <div className="text-xs text-muted-foreground">{c.phone}{c.preferred_time ? ` · Prefers: ${c.preferred_time}` : ""} · {new Date(c.created_at).toLocaleString()}</div>
              {c.notes && <div className="mt-1 text-sm text-foreground/80">{c.notes}</div>}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.status === "new" ? "bg-amber-100 text-amber-900" : c.status === "contacted" ? "bg-sky-100 text-sky-900" : "bg-emerald-100 text-emerald-900"}`}>{c.status}</span>
              {c.status !== "contacted" && <button onClick={async () => { await update({ data: { token, id: c.id, status: "contacted" } }); refetch(); }} className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">Mark contacted</button>}
              {c.status !== "done" && <button onClick={async () => { await update({ data: { token, id: c.id, status: "done" } }); refetch(); }} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">Mark done</button>}
              <button onClick={async () => { if (confirm("Delete this request?")) { await del({ data: { token, id: c.id } }); refetch(); } }} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Promo codes ---------- */
function Promos({ token }: { token: string }) {
  const list = useServerFn(adminListPromoCodes);
  const upsert = useServerFn(adminUpsertPromoCode);
  const del = useServerFn(adminDeletePromoCode);
  const { data = [], refetch } = useQuery({ queryKey: ["growth-promos"], queryFn: () => list({ data: { token } }), staleTime: 30_000 });
  const [form, setForm] = useState({ code: "", discount_type: "percent", discount_value: 10, max_uses: "", expires_at: "" });
  const save = async () => {
    try {
      await upsert({ data: {
        token,
        code: form.code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
      } });
      toast.success("Promo code saved");
      setForm({ code: "", discount_type: "percent", discount_value: 10, max_uses: "", expires_at: "" });
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save"); }
  };
  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="font-semibold text-navy">Add a promo code</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input className={inputCls} placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <select className={inputCls} value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
            <option value="percent">% off</option>
            <option value="fixed">KES off</option>
          </select>
          <input className={inputCls} type="number" min={1} placeholder="Value" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} />
          <input className={inputCls} type="number" min={1} placeholder="Max uses (optional)" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
          <input className={inputCls} type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
        </div>
        <button onClick={save} className={`${btnPrimary} mt-3`}><Plus className="h-3.5 w-3.5" /> Save code</button>
      </div>
      {data.length === 0 && <p className="text-sm text-muted-foreground">No promo codes yet.</p>}
      {data.map((p: { id: string; code: string; discount_type: string; discount_value: number; max_uses: number | null; times_used: number; expires_at: string | null; is_active: boolean; created_at: string }) => (
        <div key={p.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
          <div className="min-w-0">
            <div className="font-semibold text-navy">{p.code} <span className="text-xs font-normal text-muted-foreground">{p.discount_type === "percent" ? `${p.discount_value}% off` : `KES ${p.discount_value.toLocaleString()} off`}</span></div>
            <div className="text-xs text-muted-foreground">Used {p.times_used}{p.max_uses ? `/${p.max_uses}` : ""}{p.expires_at ? ` · expires ${p.expires_at}` : ""} · {p.is_active ? "active" : "inactive"}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={async () => { await upsert({ data: { token, code: p.code, discount_type: p.discount_type, discount_value: p.discount_value, max_uses: p.max_uses, expires_at: p.expires_at, is_active: !p.is_active } }); refetch(); }}
              className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-semibold text-foreground">{p.is_active ? "Deactivate" : "Activate"}</button>
            <button onClick={async () => { if (confirm(`Delete ${p.code}?`)) { await del({ data: { token, id: p.id } }); refetch(); } }} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Closed dates ---------- */
function ClosedDates({ token }: { token: string }) {
  const list = useServerFn(adminListBlockedDates);
  const add = useServerFn(adminAddBlockedDate);
  const del = useServerFn(adminDeleteBlockedDate);
  const { data = [], refetch } = useQuery({ queryKey: ["growth-closed"], queryFn: () => list({ data: { token } }), staleTime: 30_000 });
  const [form, setForm] = useState({ date: "", reason: "" });
  const save = async () => {
    try {
      await add({ data: { token, date: form.date, reason: form.reason || undefined } });
      toast.success("Date closed for bookings");
      setForm({ date: "", reason: "" });
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save"); }
  };
  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="font-semibold text-navy">Close a date</h2>
        <p className="text-xs text-muted-foreground">Visitors can’t pick this date on the booking form.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input className={inputCls} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <input className={inputCls} placeholder="Reason (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <button onClick={save} className={btnPrimary}><Plus className="h-3.5 w-3.5" /> Close date</button>
        </div>
      </div>
      {data.length === 0 && <p className="text-sm text-muted-foreground">No closed dates.</p>}
      {data.map((b: { id: string; date: string; reason: string | null }) => (
        <div key={b.id} className={`${card} flex items-center justify-between gap-3`}>
          <div><span className="font-semibold text-navy">{b.date}</span>{b.reason && <span className="ml-2 text-xs text-muted-foreground">{b.reason}</span>}</div>
          <button onClick={async () => { await del({ data: { token, id: b.id } }); refetch(); }} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /> Remove</button>
        </div>
      ))}
    </div>
  );
}

/* ---------- Add-ons ---------- */
function AddOns({ token }: { token: string }) {
  const list = useServerFn(adminListAddOns);
  const upsert = useServerFn(adminUpsertAddOn);
  const del = useServerFn(adminDeleteAddOn);
  const { data = [], refetch } = useQuery({ queryKey: ["growth-addons"], queryFn: () => list({ data: { token } }), staleTime: 30_000 });
  const [form, setForm] = useState({ name: "", description: "", price_kes: 0, unit: "per_day" });
  const save = async () => {
    try {
      await upsert({ data: { token, name: form.name, description: form.description || undefined, price_kes: Number(form.price_kes), unit: form.unit as "per_day" | "per_usher" | "per_event" } });
      toast.success("Add-on saved");
      setForm({ name: "", description: "", price_kes: 0, unit: "per_day" });
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save"); }
  };
  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="font-semibold text-navy">Add an extra service</h2>
        <p className="text-xs text-muted-foreground">Shown as an optional extra on the booking form.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input className={inputCls} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className={inputCls} type="number" min={0} placeholder="Price KES" value={form.price_kes} onChange={(e) => setForm({ ...form, price_kes: Number(e.target.value) })} />
          <select className={inputCls} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
            <option value="per_day">per day</option>
            <option value="per_usher">per usher</option>
            <option value="per_event">per event</option>
          </select>
        </div>
        <button onClick={save} className={`${btnPrimary} mt-3`}><Plus className="h-3.5 w-3.5" /> Save add-on</button>
      </div>
      {data.map((a: { id: string; name: string; description: string; price_kes: number; unit: string; is_active: boolean }) => (
        <div key={a.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
          <div className="min-w-0">
            <div className="font-semibold text-navy">{a.name} <span className="text-xs font-normal text-muted-foreground">KES {a.price_kes.toLocaleString()} {a.unit.replace("_", " ")}</span></div>
            <div className="text-xs text-muted-foreground">{a.description}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={async () => { await upsert({ data: { token, id: a.id, name: a.name, description: a.description || undefined, price_kes: a.price_kes, unit: a.unit as "per_day" | "per_usher" | "per_event", is_active: !a.is_active } }); refetch(); }}
              className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-semibold text-foreground">{a.is_active ? "Hide" : "Show"}</button>
            <button onClick={async () => { if (confirm(`Delete ${a.name}?`)) { await del({ data: { token, id: a.id } }); refetch(); } }} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Referrals ---------- */
function Referrals({ token }: { token: string }) {
  const list = useServerFn(adminListReferrals);
  const upsert = useServerFn(adminUpsertReferral);
  const reward = useServerFn(adminUpdateReferralReward);
  const del = useServerFn(adminDeleteReferral);
  const { data = [], refetch } = useQuery({ queryKey: ["growth-referrals"], queryFn: () => list({ data: { token } }), staleTime: 30_000 });
  const [form, setForm] = useState({ code: "", referrer_name: "", referrer_phone: "" });
  const save = async () => {
    try {
      await upsert({ data: { token, code: form.code, referrer_name: form.referrer_name, referrer_phone: form.referrer_phone || undefined } });
      toast.success("Referral code created");
      setForm({ code: "", referrer_name: "", referrer_phone: "" });
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save"); }
  };
  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="font-semibold text-navy">Create a referral code</h2>
        <p className="text-xs text-muted-foreground">When someone books with this code, the referrer earns 5% off their next booking.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input className={inputCls} placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <input className={inputCls} placeholder="Referrer's name" value={form.referrer_name} onChange={(e) => setForm({ ...form, referrer_name: e.target.value })} />
          <input className={inputCls} placeholder="Phone (optional)" value={form.referrer_phone} onChange={(e) => setForm({ ...form, referrer_phone: e.target.value })} />
        </div>
        <button onClick={save} className={`${btnPrimary} mt-3`}><Plus className="h-3.5 w-3.5" /> Create code</button>
      </div>
      {data.length === 0 && <p className="text-sm text-muted-foreground">No referral codes yet.</p>}
      {data.map((r: { id: string; code: string; referrer_name: string; referrer_phone: string; reward_given: boolean; reward_code: string | null; created_at: string }) => (
        <div key={r.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
          <div className="min-w-0">
            <div className="font-semibold text-navy">{r.code} <span className="text-xs font-normal text-muted-foreground">{r.referrer_name}{r.referrer_phone ? ` · ${r.referrer_phone}` : ""}</span></div>
            <div className="text-xs text-muted-foreground">Reward: {r.reward_given ? "given" : "pending"}{r.reward_code ? ` · ${r.reward_code}` : ""} · created {new Date(r.created_at).toLocaleDateString()}</div>
          </div>
          <div className="flex gap-2">
            {!r.reward_given && <button onClick={async () => { const rc = prompt("Reward code to send them (e.g. a promo code):") ?? ""; await reward({ data: { token, id: r.id, reward_given: true, reward_code: rc || undefined } }); refetch(); }} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"><Check className="mr-1 inline h-3.5 w-3.5" />Mark rewarded</button>}
            {r.reward_given && <button onClick={async () => { await reward({ data: { token, id: r.id, reward_given: false } }); refetch(); }} className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-semibold text-foreground"><X className="mr-1 inline h-3.5 w-3.5" />Undo</button>}
            <button onClick={async () => { if (confirm(`Delete ${r.code}?`)) { await del({ data: { token, id: r.id } }); refetch(); } }} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Articles ---------- */
type ArticleRow = { id: string; slug: string; title: string; excerpt: string; body: string; author: string; is_published: boolean; created_at: string };
const blankArticle = { slug: "", title: "", excerpt: "", body: "", author: "" };
function Articles({ token }: { token: string }) {
  const list = useServerFn(adminListArticles);
  const upsert = useServerFn(adminUpsertArticle);
  const del = useServerFn(adminDeleteArticle);
  const { data = [], refetch } = useQuery({ queryKey: ["growth-articles"], queryFn: () => list({ data: { token } }), staleTime: 30_000 });
  const [form, setForm] = useState<typeof blankArticle & { id?: string }>(blankArticle);
  const [open, setOpen] = useState(false);
  const save = async () => {
    try {
      await upsert({ data: { token, id: form.id, slug: form.slug, title: form.title, excerpt: form.excerpt, body: form.body, author: form.author || undefined } });
      toast.success("Guide saved");
      setOpen(false);
      setForm(blankArticle);
      refetch();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save"); }
  };
  return (
    <div className="space-y-4">
      <button onClick={() => { setForm(blankArticle); setOpen(!open); }} className={btnPrimary}><Plus className="h-3.5 w-3.5" /> {open ? "Close editor" : "New guide"}</button>
      {open && (
        <div className={card}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={inputCls} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.id ? form.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120) })} />
            <input className={inputCls} placeholder="Link address e.g. wedding-timeline" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} />
            <input className={inputCls} placeholder="Author (optional)" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            <input className={inputCls} placeholder="Short summary" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
          </div>
          <textarea className={`${inputCls} mt-3`} rows={8} placeholder="Guide content — blank line between paragraphs" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <button onClick={save} className={`${btnPrimary} mt-3`}>Save guide</button>
        </div>
      )}
      {data.length === 0 && <p className="text-sm text-muted-foreground">No guides yet.</p>}
      {data.map((a: ArticleRow) => (
        <div key={a.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
          <div className="min-w-0">
            <div className="font-semibold text-navy">{a.title}</div>
            <div className="text-xs text-muted-foreground">/guides/{a.slug} · {a.author} · {a.is_published ? "published" : "draft"}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setForm({ id: a.id, slug: a.slug, title: a.title, excerpt: a.excerpt, body: a.body, author: a.author }); setOpen(true); }} className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-semibold text-foreground">Edit</button>
            <button onClick={async () => { await upsert({ data: { token, id: a.id, slug: a.slug, title: a.title, excerpt: a.excerpt, body: a.body, author: a.author, is_published: !a.is_published } }); refetch(); }}
              className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-semibold text-foreground">{a.is_published ? "Unpublish" : "Publish"}</button>
            <button onClick={async () => { if (confirm(`Delete "${a.title}"?`)) { await del({ data: { token, id: a.id } }); refetch(); } }} className={btnDanger}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
