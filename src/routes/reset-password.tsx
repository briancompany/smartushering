import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, KeyRound, ShieldAlert } from "lucide-react";
import { getResetContext, applyPasswordChange } from "@/lib/tickets.functions";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Set a new password — Smart Ushering" },
    { name: "robots", content: "noindex" },
  ] }),
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : "" }),
  component: Page,
});

function Page() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const getCtx = useServerFn(getResetContext);
  const apply = useServerFn(applyPasswordChange);
  const [ctx, setCtx] = useState<{ ticket_no: string; name: string; username: string | null; expires_at: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setError("Missing reset token"); return; }
    getCtx({ data: { token } })
      .then((c) => setCtx(c))
      .catch((e) => setError(e instanceof Error ? e.message : "Invalid link"));
  }, [token, getCtx]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    setLoading(true);
    try {
      await apply({ data: { token, new_password: pw } });
      setDone(true);
      toast.success("Password updated");
      setTimeout(() => navigate({ to: "/admin/login" }), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-cream px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-luxury">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-6 w-6 text-gold" />
          <h1 className="font-display text-2xl font-semibold text-navy">Set a new password</h1>
        </div>

        {error && (
          <div className="rounded-md bg-rose-50 p-4 text-sm text-rose-800">
            <div className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4" /> {error}</div>
            <p className="mt-2 text-xs">Your temporary link is invalid, already used, or older than 24 hours. Please open a new ticket.</p>
            <Link to="/forgot-password" className="mt-3 inline-block rounded-md bg-navy px-4 py-2 text-xs font-semibold text-primary-foreground">Open new ticket</Link>
          </div>
        )}

        {!error && !ctx && <p className="text-sm text-muted-foreground">Verifying link…</p>}

        {ctx && !done && (
          <>
            <p className="text-sm text-muted-foreground">
              Ticket <span className="font-mono text-navy">{ctx.ticket_no}</span> — Hi {ctx.name}. Choose a new password for
              <span className="font-semibold text-navy"> {ctx.username}</span>.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Link valid until {new Date(ctx.expires_at).toLocaleString()}.</p>
            <form onSubmit={submit} className="mt-4 space-y-3">
              <input required type="password" placeholder="New password (min 8 chars)" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full rounded-md border px-3 py-2.5 text-sm" />
              <input required type="password" placeholder="Confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="w-full rounded-md border px-3 py-2.5 text-sm" />
              <button disabled={loading} className="w-full rounded-md bg-navy py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{loading ? "Updating…" : "Update password"}</button>
            </form>
          </>
        )}

        {done && (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <p className="mt-3 text-sm">Password updated. Redirecting to sign in…</p>
          </div>
        )}
      </div>
    </div>
  );
}
