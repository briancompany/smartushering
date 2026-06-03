import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminListBookings } from "@/lib/admin.functions";
import { adminListStaff, adminListAssignments, adminUpsertAssignment, adminDeleteAssignment } from "@/lib/admin-phase2.functions";

export const Route = createFileRoute("/admin/assignments")({
  head: () => ({ meta: [{ title: "Assignments — Admin" }] }),
  component: Page,
});

function Page() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const bookings = useServerFn(adminListBookings);
  const staffFn = useServerFn(adminListStaff);
  const assignFn = useServerFn(adminListAssignments);
  const upsert = useServerFn(adminUpsertAssignment);
  const del = useServerFn(adminDeleteAssignment);
  const { data: bks = [] } = useQuery({ queryKey: ["bookings-approved", token], queryFn: () => bookings({ data: { token: token! } }), enabled: !!token });
  const { data: staff = [] } = useQuery({ queryKey: ["staff-list", token], queryFn: () => staffFn({ data: { token: token! } }), enabled: !!token });
  const { data: assigns = [] } = useQuery({ queryKey: ["assignments", token], queryFn: () => assignFn({ data: { token: token! } }), enabled: !!token });
  const [picked, setPicked] = useState<string | null>(null);
  const [staffId, setStaffId] = useState("");
  const [tl, setTl] = useState(false);
  const [report, setReport] = useState("");
  if (!token) return null;

  const approved = bks.filter((b) => b.status === "approved" || b.status === "completed");
  const bookingAssignments = assigns.filter((a) => a.booking_id === picked);

  const assign = async () => {
    if (!picked || !staffId) return toast.error("Pick booking and staff");
    try {
      await upsert({ data: { token, booking_id: picked, staff_id: staffId, is_team_leader: tl, report_time: report || undefined, status: "assigned" } });
      setStaffId(""); setTl(false); setReport("");
      qc.invalidateQueries({ queryKey: ["assignments"] });
      toast.success("Assigned");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const setStatus = async (id: string, status: "assigned" | "confirmed" | "attended" | "completed") => {
    const a = assigns.find((x) => x.id === id);
    if (!a) return;
    await upsert({ data: { token, id, booking_id: a.booking_id, staff_id: a.staff_id, is_team_leader: a.is_team_leader, status } });
    qc.invalidateQueries({ queryKey: ["assignments"] });
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Staff assignments</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Approved bookings</h2>
          {approved.map((b) => (
            <button key={b.id} onClick={() => setPicked(b.id)} className={`block w-full rounded-lg border p-3 text-left ${picked === b.id ? "border-gold bg-cream" : "bg-white"}`}>
              <div className="font-semibold text-navy">{b.full_name}</div>
              <div className="text-xs text-muted-foreground">{b.event_type} • {b.event_date}</div>
              <div className="text-xs text-muted-foreground">{b.venue}, {b.county}</div>
              <div className="mt-1 text-xs">Needs <strong>{b.number_of_ushers}</strong> ushers</div>
            </button>
          ))}
          {approved.length === 0 && <p className="text-sm text-muted-foreground">No approved bookings yet.</p>}
        </div>

        <div>
          {picked ? (
            <>
              <div className="rounded-xl border bg-white p-4">
                <h3 className="font-semibold text-navy">Assign staff to this booking</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
                    <option value="">Select staff…</option>
                    {staff.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.full_name} — {s.role}</option>)}
                  </select>
                  <input type="datetime-local" value={report} onChange={(e) => setReport(e.target.value)} className="rounded-md border px-3 py-2 text-sm" />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tl} onChange={(e) => setTl(e.target.checked)} /> Team leader</label>
                  <button onClick={assign} className="rounded-md bg-navy py-2 text-sm font-semibold text-primary-foreground">Assign</button>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-cream text-left text-xs uppercase text-muted-foreground"><tr>{["Staff","Role","Report time","Status","Actions"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
                  <tbody>
                    {bookingAssignments.map((a) => (
                      <tr key={a.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{a.staff?.full_name} {a.is_team_leader && <span className="ml-1 rounded bg-gold px-1.5 text-[10px] text-gold-foreground">TL</span>}</td>
                        <td className="px-4 py-3 capitalize">{a.staff?.role?.replace("_"," ")}</td>
                        <td className="px-4 py-3 text-xs">{a.report_time ? new Date(a.report_time).toLocaleString() : "—"}</td>
                        <td className="px-4 py-3"><span className="rounded-full bg-cream px-2 py-1 text-xs">{a.status}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {["confirmed","attended","completed"].map((s) => (
                              <button key={s} onClick={() => setStatus(a.id, s as "confirmed" | "attended" | "completed")} className="rounded border px-2 py-1 text-[10px] capitalize">{s}</button>
                            ))}
                            <button onClick={async () => { await del({ data: { token, id: a.id } }); qc.invalidateQueries({ queryKey: ["assignments"] }); }} className="rounded bg-rose-100 px-2 py-1 text-[10px] text-rose-700">×</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {bookingAssignments.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No staff assigned yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          ) : <p className="text-muted-foreground">Pick an approved booking on the left to assign staff.</p>}
        </div>
      </div>
    </AdminLayout>
  );
}
