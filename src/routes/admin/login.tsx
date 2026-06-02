import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { adminLogin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login — Smart Ushering" }] }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const login = useServerFn(adminLogin);
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ data: form });
      localStorage.setItem("su_admin_token", res.token);
      toast.success("Welcome back, " + res.username);
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
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-navy"><span className="font-display text-xl font-bold text-gold">S</span></div>
            <h1 className="mt-4 font-display text-2xl font-semibold text-navy">Admin Login</h1>
            <p className="mt-1 text-sm text-muted-foreground">Smart Ushering management portal</p>
          </div>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <input required placeholder="Username" autoFocus value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full rounded-md border px-3 py-2.5 text-sm" />
            <input required type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-md border px-3 py-2.5 text-sm" />
            <button disabled={loading} className="w-full rounded-md bg-navy py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{loading ? "Signing in..." : "Sign in"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
