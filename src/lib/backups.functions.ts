import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAudit } from "./audit.server";

async function requireAdmin(token: string) {
  if (!token) throw new Error("Unauthorized");
  const { data } = await supabaseAdmin.from("admin_users").select("id, username, session_expires_at").eq("session_token", token).maybeSingle();
  if (!data) throw new Error("Unauthorized");
  if (data.session_expires_at && new Date(data.session_expires_at) < new Date()) throw new Error("Session expired");
  return data;
}

const TABLES = [
  "bookings", "contact_submissions", "chat_conversations", "chat_messages",
  "pricing_packages", "services", "faqs", "gallery_images", "testimonials",
  "reviews", "site_settings", "staff", "booking_assignments", "quotes",
  "notifications", "audit_logs",
] as const;

/** Create a JSON snapshot of all business tables, upload to the backups bucket, return a signed URL. */
export const adminCreateBackup = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const snapshot: Record<string, unknown[]> = {};
    for (const t of TABLES) {
      const { data: rows, error } = await supabaseAdmin.from(t).select("*");
      if (error) throw new Error(`Backup failed on ${t}: ${error.message}`);
      snapshot[t] = rows ?? [];
    }
    const payload = {
      version: 1,
      created_at: new Date().toISOString(),
      project: "smart-ushering",
      tables: snapshot,
    };
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `backup-${stamp}.json`;
    const body = new TextEncoder().encode(JSON.stringify(payload));
    const { error: upErr } = await supabaseAdmin.storage.from("backups").upload(path, body, {
      contentType: "application/json", upsert: false,
    });
    if (upErr) throw new Error(upErr.message);
    const { data: signed } = await supabaseAdmin.storage.from("backups").createSignedUrl(path, 60 * 60);
    await logAudit({ actor: admin.username, action: "backup.create", entity: "backup", diff: { path, rowCounts: Object.fromEntries(Object.entries(snapshot).map(([k, v]) => [k, v.length])) } });
    return { ok: true, path, signedUrl: signed?.signedUrl ?? "", rowCounts: Object.fromEntries(Object.entries(snapshot).map(([k, v]) => [k, v.length])) };
  });

export const adminListBackups = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: files, error } = await supabaseAdmin.storage.from("backups").list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new Error(error.message);
    return (files ?? []).filter((f) => f.name.endsWith(".json")).map((f) => ({
      name: f.name,
      size: f.metadata?.size ?? 0,
      created_at: f.created_at ?? null,
    }));
  });

export const adminGetBackupUrl = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), path: z.string().min(1).max(300) }).parse(d))
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: signed, error } = await supabaseAdmin.storage.from("backups").createSignedUrl(data.path, 60 * 60);
    if (error) throw new Error(error.message);
    return { signedUrl: signed?.signedUrl ?? "" };
  });

export const adminDeleteBackup = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string(), path: z.string().min(1).max(300) }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { error } = await supabaseAdmin.storage.from("backups").remove([data.path]);
    if (error) throw new Error(error.message);
    await logAudit({ actor: admin.username, action: "backup.delete", entity: "backup", diff: { path: data.path } });
    return { ok: true };
  });

/** Restore a backup by upserting rows into each table. Skips tables not in the snapshot. */
export const adminRestoreBackup = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string(),
    path: z.string().min(1).max(300),
    confirm: z.literal("RESTORE"),
  }).parse(d))
  .handler(async ({ data }) => {
    const admin = await requireAdmin(data.token);
    const { data: file, error } = await supabaseAdmin.storage.from("backups").download(data.path);
    if (error || !file) throw new Error(error?.message ?? "Backup not found");
    const text = await file.text();
    const parsed = JSON.parse(text) as { tables: Record<string, unknown[]> };
    if (!parsed?.tables) throw new Error("Invalid backup file");
    const results: Record<string, number> = {};
    for (const t of TABLES) {
      const rows = parsed.tables[t];
      if (!Array.isArray(rows) || rows.length === 0) { results[t] = 0; continue; }
      const { error: upErr } = await supabaseAdmin.from(t).upsert(rows as never[], { onConflict: "id" });
      if (upErr) throw new Error(`Restore failed on ${t}: ${upErr.message}`);
      results[t] = rows.length;
    }
    await logAudit({ actor: admin.username, action: "backup.restore", entity: "backup", diff: { path: data.path, results } });
    return { ok: true, results };
  });
