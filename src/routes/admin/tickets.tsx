import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, MessageSquare, KeyRound, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminListTickets, adminUpdateTicket, adminResetTicketPassword, adminGenerateTicketPassword, adminDeleteTicket } from "@/lib/tickets.functions";

export const Route = createFileRoute("/admin/tickets")({
  head: () => ({ meta: [{ title: "Support Tickets — Admin" }] }),
  component: Page,
  errorComponent: () => <div className="p-8">Failed to load tickets.</div>,
  notFoundComponent: () => <div className="p-8">Not found.</div>,
});

const STATUSES = ["open","in_progress","resolved","closed"] as const;
const PAGE_SIZE = 20;

function statusBadge(s: string) {
  if (s === "resolved" || s === "closed") return "bg-emerald-100 text-emerald-700";
  if (s === "in_progress") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-700";
}

function priorityBadge(p: string) {
  if (p === "urgent") return "bg-rose-600 text-white";
  if (p === "high") return "bg-amber-500 text-white";
  return "bg-slate-200 text-slate-700";
}

function Page() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const list = useServerFn(adminListTickets);
  const update = useServerFn(adminUpdateTicket);
  const resetPw = useServerFn(adminResetTicketPassword);
  const generatePw = useServerFn(adminGenerateTicketPassword);
  const del = useServerFn(adminDeleteTicket);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<typeof STATUSES[number] | "">("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const { data } = useQuery({
    queryKey: ["tickets", token, page, statusFilter],
    queryFn: () => list({ data: { token: token!, page, pageSize: PAGE_SIZE, status: statusFilter || undefined } }),
    enabled: !!token,
    staleTime: 30_000,
  });

  if (!token) return null;
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const openTicket = rows.find((r) => r.id === openId);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tickets"] });

  const saveResponse = async (id: string, status: typeof STATUSES[number]) => {
    try { await update({ data: { token, id, status, admin_response: response || undefined } }); toast.success("Updated"); invalidate(); setOpenId(null); setResponse(""); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const doPasswordReset = async () => {
    if (!openTicket || !newPassword) return;
    try {
      const res = await resetPw({ data: { token, id: openTicket.id, new_password: newPassword } });
      const msg = `Hi ${openTicket.submitter_name}, your Smart Ushering password has been reset.\n\nUsername: ${res.username}\nNew password: ${newPassword}\n\nPlease sign in and change it immediately.`;
      const phone = (res.phone ?? "").replace(/[^0-9]/g, "").replace(/^0/, "254");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
      toast.success("Password reset. WhatsApp opened.");
      setNewPassword(""); setOpenId(null); invalidate();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete ticket permanently?")) return;
    try { await del({ data: { token, id } }); toast.success("Deleted"); invalidate(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const waNumber = (p: string) => (p ?? "").replace(/[^0-9]/g, "").replace(/^0/, "254");

  const genericTicketMessage = (t: { ticket_no: string; submitter_name: string; status: string; subject: string; admin_response: string | null }) => {
    const trackUrl = `${window.location.origin}/track-ticket`;
    return `Hi ${t.submitter_name}, update on your Smart Ushering ticket ${t.ticket_no}\n\nSubject: ${t.subject}\nStatus: ${t.status.replace("_"," ")}` +
      (t.admin_response ? `\n\nResponse:\n${t.admin_response}` : "") +
      `\n\nTrack any time: ${trackUrl}`;
  };

  const openTicketWhatsApp = (t: typeof rows[number]) => {
    const phone = waNumber(t.submitter_phone);
    if (!phone) return toast.error("No phone on ticket");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(genericTicketMessage(t))}`, "_blank");
  };

  const generateAndSend = async () => {
    if (!openTicket) return;
    try {
      const res = await generatePw({ data: { token, id: openTicket.id, origin: window.location.origin } });
      const msg = `Hi ${res.submitter_name}, your Smart Ushering account has a NEW temporary password.\n\n` +
        `Username: ${res.username}\n` +
        `Temporary password: ${res.password}\n` +
        `Valid until: ${new Date(res.expires_at).toLocaleString()} (24 hours)\n\n` +
        `Tap the secure link below to set your own password now:\n${res.reset_url}\n\n` +
        `Ticket ${res.ticket_no}. Do NOT share this message.`;
      const phone = waNumber(res.phone);
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
      toast.success("Password generated. WhatsApp opened.");
      setOpenId(null); invalidate();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const markDone = async (id: string) => {
    try { await update({ data: { token, id, status: "resolved" } }); toast.success("Marked done"); invalidate(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-navy">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">Password resets, account help, bug reports and other requests. {total} total.</p>
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as typeof STATUSES[number] | ""); setPage(1); }} className="rounded-md border px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
        </select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase text-muted-foreground"><tr>{["Ticket","Category","Subject","Submitter","Priority","Status","Created","Actions"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t hover:bg-cream/50">
                <td className="px-4 py-3 font-mono text-xs">{t.ticket_no}</td>
                <td className="px-4 py-3 capitalize">{t.category.replace("_"," ")}</td>
                <td className="px-4 py-3"><button onClick={() => { setOpenId(t.id); setResponse(t.admin_response ?? ""); }} className="text-left font-medium text-navy hover:underline">{t.subject}</button></td>
                <td className="px-4 py-3"><div>{t.submitter_name}</div><div className="text-xs text-muted-foreground">{t.submitter_phone}</div></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${priorityBadge(t.priority)}`}>{t.priority}</span></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${statusBadge(t.status)}`}>{t.status.replace("_"," ")}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button title="WhatsApp update" onClick={() => openTicketWhatsApp(t)} className="rounded bg-[#25D366] p-1.5 text-white hover:opacity-90"><Send className="h-3.5 w-3.5" /></button>
                    {t.status !== "resolved" && t.status !== "closed" && (
                      <button title="Mark done" onClick={() => markDone(t.id)} className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white">Done</button>
                    )}
                    <button title="Delete" onClick={() => remove(t.id)} className="rounded bg-rose-100 p-1.5 text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No tickets.</td></tr>}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-muted-foreground">Page {page} of {pages}</div>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1.5 disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
            <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded border px-3 py-1.5 disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {openTicket && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setOpenId(null)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-mono text-xs text-muted-foreground">{openTicket.ticket_no}</div>
                <h2 className="font-display text-xl font-semibold text-navy">{openTicket.subject}</h2>
                <div className="mt-1 text-xs text-muted-foreground capitalize">{openTicket.category.replace("_"," ")} • {openTicket.submitter_name} • {openTicket.submitter_phone}</div>
              </div>
              <button title="WhatsApp" onClick={() => openTicketWhatsApp(openTicket)} className="rounded-md bg-[#25D366] p-2 text-white"><Send className="h-4 w-4" /></button>
            </div>
            {openTicket.details && <p className="mt-3 whitespace-pre-wrap rounded bg-cream p-3 text-sm">{openTicket.details}</p>}

            {openTicket.category === "forgot_password" && (
              <div className="mt-4 space-y-2 rounded-lg border border-gold bg-gold/10 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-navy"><KeyRound className="h-4 w-4" /> Auto-generate temporary password (24 h)</div>
                <p className="text-xs text-muted-foreground">System creates a strong temporary password + a one-time secure link. Both are sent to the user via WhatsApp. They tap the link to set their own password. Temporary password expires in 24 hours.</p>
                <button onClick={generateAndSend} className="w-full rounded-md bg-gold px-4 py-2 text-sm font-semibold text-gold-foreground">Generate & Send via WhatsApp</button>
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Advanced: manual password</summary>
                  <div className="mt-2 flex gap-2">
                    <input type="text" placeholder="Manual password (min 8)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="flex-1 rounded-md border px-3 py-2" />
                    <button disabled={newPassword.length < 8} onClick={doPasswordReset} className="rounded-md bg-navy px-4 py-2 text-white disabled:opacity-50">Set & WhatsApp</button>
                  </div>
                </details>
              </div>
            )}

            <div className="mt-4">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Admin response</label>
              <textarea rows={3} value={response} onChange={(e) => setResponse(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => saveResponse(openTicket.id, "in_progress")} className="rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-white"><MessageSquare className="mr-1 inline h-3 w-3" />Mark in progress</button>
              <button onClick={() => saveResponse(openTicket.id, "resolved")} className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Mark resolved</button>
              <button onClick={() => saveResponse(openTicket.id, "closed")} className="rounded-md bg-slate-600 px-3 py-2 text-xs font-semibold text-white">Close</button>
              <button onClick={() => setOpenId(null)} className="ml-auto rounded-md border px-3 py-2 text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
