import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Trash2, KeyRound, Power } from "lucide-react";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import {
  adminListAccounts, adminCreateAccount, adminUpdateAccount,
  adminDeleteAccount, adminRevokeSession,
} from "@/lib/admin.functions";
import { ROLE_LABELS, getSession } from "@/lib/auth-client";

export const Route = createFileRoute("/admin/accounts")({
  head: () => ({ meta: [{ title: "Accounts — Admin" }] }),
  component: Page,
});

const ROLES = ["super_admin","staff_management","bookings_operations","customer_support","media_content","finance_reporting","staff"] as const;
type Role = (typeof ROLES)[number];

type WhatsappPayload = {
  full_name: string; username: string; phone: string;
  email: string | null; password?: string | null;
};

function buildInviteMessage(p: WhatsappPayload) {
  const portal = typeof window !== "undefined" ? window.location.origin : "https://smartushering.lovable.app";
  const pwLine = p.password ? `🔑 Temporary Password: ${p.password}\n` : "";
  return `Hello ${p.full_name} (@${p.username}) 👋, welcome to the Smart Ushering team!

Your staff portal account has been created. Here are your login details:
🔗 Portal Link: ${portal}/admin/login
👤 Username: ${p.username}
📧 Email: ${p.email ?? "—"}
📞 Phone: ${p.phone}
${pwLine}
You can log in using your username, email address, or phone number with your password.

Please change your password immediately after first login.

For login difficulties contact support:
📞 0113 867 444
✉ Smartushering@gmail.com

Welcome aboard! 💛
— Smart Ushering Management`;
}

function openWhatsApp(p: WhatsappPayload) {
  const sender = window.prompt(
    "Send from which number?\nType 1 for 0113 867 444 (Support)\nType 2 for 0112 836 281 (Main)",
    "2",
  );
  if (sender !== "1" && sender !== "2") return;
  const recipient = p.phone.replace(/[^0-9]/g, "").replace(/^0/, "254");
  const url = `https://wa.me/${recipient}?text=${encodeURIComponent(buildInviteMessage(p))}`;
  window.open(url, "_blank", "noopener");
}

function Page() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const list = useServerFn(adminListAccounts);
  const create = useServerFn(adminCreateAccount);
  const update = useServerFn(adminUpdateAccount);
  const del = useServerFn(adminDeleteAccount);
  const revoke = useServerFn(adminRevokeSession);
  const { data = [] } = useQuery({ queryKey: ["accounts", token], queryFn: () => list({ data: { token: token! } }), enabled: !!token, staleTime: 30_000 });
  const me = getSession();
  const [form, setForm] = useState({
    full_name: "", username: "", staff_id: "", phone: "", email: "", password: "",
    role: "staff" as Role, department: "", is_department_head: false,
  });

  if (!token) return null;
  if (me && !me.is_super_admin) {
    return <AdminLayout><div className="rounded-xl border bg-white p-6 text-sm text-muted-foreground">Only Super Admins can manage accounts.</div></AdminLayout>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create({ data: { token, ...form } });
      toast.success("Account created");
      // Offer WhatsApp send immediately with the password still known
      if (confirm("Send login instructions via WhatsApp now?")) {
        openWhatsApp({
          full_name: form.full_name, username: form.username,
          phone: form.phone, email: form.email || null, password: form.password,
        });
      }
      setForm({ full_name: "", username: "", staff_id: "", phone: "", email: "", password: "", role: "staff", department: "", is_department_head: false });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Accounts & roles</h1>
      <p className="text-sm text-muted-foreground">Create staff/admin accounts and send WhatsApp login instructions. Staff sign in with username, email, or phone.</p>

      <form onSubmit={submit} className="mt-6 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input required placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <input required placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <input required placeholder="Staff ID (e.g. SU-001)" value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value.toUpperCase() })} className="rounded-md border px-3 py-2 text-sm" />
        <input required placeholder="Phone (07…)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <input required type="password" placeholder="Temporary password (min 8)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="rounded-md border px-3 py-2 text-sm">
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <input placeholder="Department (optional)" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={form.is_department_head} onChange={(e) => setForm({ ...form, is_department_head: e.target.checked })} />
          Set as Department Head
        </label>
        <button className="rounded-md bg-navy px-3 py-2 text-sm font-semibold text-primary-foreground sm:col-span-2 lg:col-span-2">Create account</button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase text-muted-foreground"><tr>{["Name","Staff ID","Email / Phone","Role","Status","Actions"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {data.map((a) => {
              const deactivated = !a.is_active;
              return (
                <tr key={a.id} className={`border-t ${deactivated ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium">
                    {a.full_name ?? "—"} <span className="text-xs text-muted-foreground">(@{a.username})</span>
                    {a.is_department_head && <span className="ml-2 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold text-navy">HEAD</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{a.staff_id ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    <div>{a.email ?? "—"}</div>
                    <div className="text-muted-foreground">{a.phone ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3">{ROLE_LABELS[a.role] ?? a.role}</td>
                  <td className="px-4 py-3">{a.is_active
                    ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Active</span>
                    : <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">Deactivated</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {a.phone && a.full_name && (
                        <button
                          onClick={() => openWhatsApp({
                            full_name: a.full_name!, username: a.username,
                            phone: a.phone!, email: a.email ?? null,
                          })}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white">
                          <MessageCircle className="h-3 w-3" /> WhatsApp
                        </button>
                      )}
                      <button onClick={async () => { await update({ data: { token, id: a.id, is_active: !a.is_active } }); qc.invalidateQueries({ queryKey: ["accounts"] }); toast.success(a.is_active ? "Deactivated" : "Reactivated"); }}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]">
                        <Power className="h-3 w-3" /> {a.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                      <button onClick={async () => { const p = prompt("New temporary password (min 8 chars):"); if (p && p.length >= 8) { await update({ data: { token, id: a.id, new_password: p } }); toast.success("Password updated. Send via WhatsApp to share."); if (confirm("Open WhatsApp to send new password?") && a.full_name && a.phone) { openWhatsApp({ full_name: a.full_name, username: a.username, phone: a.phone, email: a.email ?? null, password: p }); } } }}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]">
                        <KeyRound className="h-3 w-3" /> Reset PW
                      </button>
                      <button onClick={async () => { if (confirm("Force sign-out this user?")) { await revoke({ data: { token, id: a.id } }); toast.success("Session revoked"); } }}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]">Revoke</button>
                      {me?.username !== a.username && (
                        <button onClick={async () => { if (confirm(`Delete ${a.username}?`)) { await del({ data: { token, id: a.id } }); qc.invalidateQueries({ queryKey: ["accounts"] }); toast.success("Deleted"); } }}
                          className="inline-flex items-center gap-1 rounded-md bg-destructive px-2 py-1 text-[11px] text-destructive-foreground">
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No accounts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
