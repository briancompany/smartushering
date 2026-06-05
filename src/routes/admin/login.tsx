import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { adminLogin } from "@/lib/admin.functions";
import { setSession } from "@/lib/auth-client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Sign in — Smart Ushering" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const login = useServerFn(adminLogin);
  const [form, setForm] = useState({ identifier: "", password: "", remember: false });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ data: form });
      setSession(res);
      toast.success("Welcome, " + (res.full_name ?? res.username));
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-cream px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy"><ArrowLeft className="h-4 w-4" /> Back to website</Link>
        <div className="rounded-2xl border bg-white p-8 shadow-luxury">
          <div className="text-center">
            <img src="/icon-512.png" alt="Smart Ushering" width={56} height={56} className="mx-auto rounded-lg" />
            <h1 className="mt-4 font-display text-2xl font-semibold text-navy">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">Use your username, Staff ID, or phone number</p>
          </div>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input required placeholder="Username, Staff ID, or Phone" autoFocus value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} className="w-full rounded-md border px-3 py-2.5 text-sm" />
            <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-md border px-3 py-2.5 text-sm" />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={form.remember} onChange={(e) => setForm({ ...form, remember: e.target.checked })} />
              Remember me for 30 days
            </label>
            <button disabled={loading} className="w-full rounded-md bg-navy py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{loading ? "Signing in..." : "Sign in"}</button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">Account locked? Contact Smartushering@gmail.com</p>
        </div>
      </div>
    </div>
  );
}
