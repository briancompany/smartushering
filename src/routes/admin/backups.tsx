import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Trash2, RefreshCw, Database, Upload } from "lucide-react";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import {
  adminCreateBackup, adminListBackups, adminGetBackupUrl,
  adminDeleteBackup, adminRestoreBackup,
} from "@/lib/backups.functions";

export const Route = createFileRoute("/admin/backups")({
  head: () => ({ meta: [{ title: "Backups & Recovery — Admin" }] }),
  component: Page,
});

function Page() {
  const token = useAdminToken();
  const create = useServerFn(adminCreateBackup);
  const list = useServerFn(adminListBackups);
  const getUrl = useServerFn(adminGetBackupUrl);
  const del = useServerFn(adminDeleteBackup);
  const restore = useServerFn(adminRestoreBackup);

  const { data = [], refetch, isFetching } = useQuery({
    queryKey: ["admin-backups", token], queryFn: () => list({ data: { token: token! } }), enabled: !!token,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!token) return null;

  async function runBackup() {
    setBusy(true); setMsg(null);
    try {
      const r = await create({ data: { token: token! } });
      setMsg(`Backup created: ${r.path} — ${Object.values(r.rowCounts).reduce((s, n) => s + n, 0)} rows.`);
      refetch();
    } catch (e) { setMsg(e instanceof Error ? e.message : "Backup failed"); }
    finally { setBusy(false); }
  }

  async function download(path: string) {
    const { signedUrl } = await getUrl({ data: { token: token!, path } });
    if (signedUrl) window.open(signedUrl, "_blank");
  }

  async function runRestore(path: string) {
    const phrase = prompt(`This will OVERWRITE current data using "${path}".\n\nType RESTORE to confirm:`);
    if (phrase !== "RESTORE") return;
    setBusy(true); setMsg(null);
    try {
      const r = await restore({ data: { token: token!, path, confirm: "RESTORE" } });
      setMsg(`Restored: ${Object.entries(r.results).map(([k, v]) => `${k}=${v}`).join(", ")}`);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Restore failed"); }
    finally { setBusy(false); }
  }

  async function removeBackup(path: string) {
    if (!confirm(`Delete backup ${path}?`)) return;
    await del({ data: { token: token!, path } });
    refetch();
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-navy">Backups & Recovery</h1>
          <p className="text-sm text-muted-foreground">Create one-click JSON snapshots of every business table. Restore any snapshot in one click.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runBackup} disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            <Database className="h-4 w-4" /> {busy ? "Working…" : "Create backup now"}
          </button>
          <button onClick={() => refetch()} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {msg && <div className="mt-4 rounded-md border bg-cream p-3 text-sm">{msg}</div>}

      <div className="mt-6 rounded-xl border bg-white">
        <div className="border-b px-4 py-3 text-xs uppercase text-muted-foreground">Available backups ({data.length})</div>
        <ul className="divide-y">
          {data.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No backups yet. Create your first snapshot above.</li>}
          {data.map((f) => (
            <li key={f.name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="font-mono text-sm">{f.name}</div>
                <div className="text-xs text-muted-foreground">{f.created_at ? new Date(f.created_at).toLocaleString() : "—"} · {(f.size / 1024).toFixed(1)} KB</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => download(f.name)} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs"><Download className="h-3.5 w-3.5" /> Download</button>
                <button onClick={() => runRestore(f.name)} className="inline-flex items-center gap-1 rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-gold-foreground"><Upload className="h-3.5 w-3.5" /> Restore</button>
                <button onClick={() => removeBackup(f.name)} className="inline-flex items-center gap-1 rounded-md bg-destructive px-3 py-1.5 text-xs text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Note: Lovable Cloud also performs automatic daily database backups at the infrastructure level. These on-demand snapshots give you instant downloadable copies for extra safety.
      </p>
    </AdminLayout>
  );
}
