import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function logAudit(opts: {
  actor: string;
  action: string;
  entity: string;
  entity_id?: string | null;
  diff?: Record<string, unknown> | null;
}) {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      actor: opts.actor,
      action: opts.action,
      entity: opts.entity,
      entity_id: opts.entity_id ?? null,
      diff: opts.diff ?? null,
    });
  } catch (e) {
    console.error("[audit] failed", e);
  }
}

export async function pushNotification(opts: {
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
}) {
  try {
    await supabaseAdmin.from("notifications").insert({
      type: opts.type,
      title: opts.title,
      body: opts.body ?? null,
      link: opts.link ?? null,
      entity_type: opts.entity_type ?? null,
      entity_id: opts.entity_id ?? null,
    });
  } catch (e) {
    console.error("[notify] failed", e);
  }
}
