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

function whatsappInviteUrl(staff: { full_name: string; username: string; staff_id: string; role: string; phone: string; department?: string | null }) {
  const portal = typeof window !== "undefined" ? `${window.location.origin}/admin/login` : "/admin/login";
  const msg = `Hello ${staff.full_name},\n\nYou've been added to the Smart Ushering staff portal.\n\nName: ${staff.full_name}\nStaff ID: ${staff.staff_id}\nUsername: ${staff.username}\nRole: ${ROLE_LABELS[staff.role] ?? staff.role}${staff.department ? `\nDepartment: ${staff.department}` : ""}\n\nSign in at: ${portal}\n(Use your Staff ID, username, or phone number with the password provided to you.)\n\n— Smart Ushering`;
  const phone = staff.phone.replace(/[^0-9]/g, "").replace(/^0/, "254");
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function Page() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const list = useServerFn(adminListAccounts);
  const create = useServerFn(adminCreateAccount);
  const update = useServerFn(adminUpdateAccount);
  const del = useServerFn(adminDeleteAccount);
  const revoke = useServerFn(adminRevokeSession);
  const { data = [] } = useQuery({ queryKey: ["accounts", token], queryFn: () => list({ data: { token: token! } }), enabled: !!token });
  const me = getSession();
  const [form, setForm] = useState({
    full_name: "", username: "", staff_id: "", phone: "", password: "",
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
      setForm({ full_name: "", username: "", staff_id: "", phone: "", password: "", role: "staff", department: "", is_department_head: false });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Accounts & roles</h1>
      <p className="text-sm text-muted-foreground">Create staff/admin accounts, assign roles, and send WhatsApp invites.</p>

      <form onSubmit={submit} className="mt-6 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input required placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <input required placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <input required placeholder="Staff ID (e.g. SU-001)" value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value.toUpperCase() })} className="rounded-md border px-3 py-2 text-sm" />
        <input required placeholder="Phone (07…)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <input required type="password" placeholder="Temporary password (min 8)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="rounded-md border px-3 py-2 text-sm">
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <input placeholder="Department (optional)" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="rounded-md border px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
          <input type="checkbox" checked={form.is_department_head} onChange={(e) => setForm({ ...form, is_department_head: e.target.checked })} />
          Set as Department Head
        </label>
        <button className="rounded-md bg-navy px-3 py-2 text-sm font-semibold text-primary-foreground sm:col-span-2 lg:col-span-4">Create account</button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream text-left text-xs uppercase text-muted-foreground"><tr>{["Name","Staff ID","Username","Phone","Role","Status","Actions"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-3 font-medium">{a.full_name ?? "—"}{a.is_department_head && <span className="ml-2 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold text-navy">HEAD</span>}</td>
                <td className="px-4 py-3 font-mono text-xs">{a.staff_id ?? "—"}</td>
                <td className="px-4 py-3">{a.username}</td>
                <td className="px-4 py-3">{a.phone ?? "—"}</td>
                <td className="px-4 py-3">{ROLE_LABELS[a.role] ?? a.role}</td>
                <td className="px-4 py-3">{a.is_active ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Active</span> : <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs">Inactive</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {a.phone && a.staff_id && a.full_name && (
                      <a href={whatsappInviteUrl({ full_name: a.full_name, username: a.username, staff_id: a.staff_id, role: a.role, phone: a.phone, department: a.department })} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white">
                        <MessageCircle className="h-3 w-3" /> Invite
                      </a>
                    )}
                    <button onClick={async () => { await update({ data: { token, id: a.id, is_active: !a.is_active } }); qc.invalidateQueries({ queryKey: ["accounts"] }); }}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]">
                      <Power className="h-3 w-3" /> {a.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={async () => { const p = prompt("New password (min 8 chars):"); if (p && p.length >= 8) { await update({ data: { token, id: a.id, new_password: p } }); toast.success("Password updated"); } }}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]">
                      <KeyRound className="h-3 w-3" /> Reset PW
                    </button>
                    <button onClick={async () => { if (confirm("Revoke active session?")) { await revoke({ data: { token, id: a.id } }); toast.success("Session revoked"); } }}
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
            ))}
            {data.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No accounts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
