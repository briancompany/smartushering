import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, updateMyAvatar } from "@/lib/admin.functions";
import { getSession, setSession } from "@/lib/auth-client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export function ProfileAvatar({
  url,
  name,
  size = 44,
  className = "",
}: { url?: string | null; name?: string | null; size?: number; className?: string }) {
  const initials = (name ?? "")
    .split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
  return (
    <span
      style={{ width: size, height: size }}
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-gold/20 text-xs font-semibold text-gold ring-2 ring-white/20 ${className}`}
    >
      {url ? (
        <img src={url} alt={name ?? "Profile"} className="h-full w-full object-cover" />
      ) : initials === "?" ? (
        <User style={{ width: size * 0.5, height: size * 0.5 }} />
      ) : (
        <span style={{ fontSize: Math.max(10, size * 0.34) }}>{initials}</span>
      )}
    </span>
  );
}

/** Avatar with a camera icon to upload / update the signed-in user's profile picture. */
export function AvatarUploader({
  token,
  name,
  size = 56,
  initialUrl,
  onChange,
}: {
  token: string;
  name?: string | null;
  size?: number;
  initialUrl?: string | null;
  onChange?: (url: string | null) => void;
}) {
  const fetchProfile = useServerFn(getMyProfile);
  const saveAvatar = useServerFn(updateMyAvatar);
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl ?? getSession()?.avatar_url ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchProfile({ data: { token } })
      .then((p) => { if (alive) setUrl(p.avatar_url ?? null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [token, fetchProfile]);

  const pick = (file: File) => {
    void (async () => {
      if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
      if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return; }
      setBusy(true);
      try {
        const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${token.slice(0, 12)}/${Date.now()}.${ext || "jpg"}`;
        const { error: upErr } = await supabase.storage
          .from("avatars").upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) throw upErr;
        const { data: signed, error: sErr } = await supabase.storage
          .from("avatars").createSignedUrl(path, TEN_YEARS);
        if (sErr || !signed?.signedUrl) throw sErr ?? new Error("Could not get image link");
        await saveAvatar({ data: { token, avatar_url: signed.signedUrl } });
        setUrl(signed.signedUrl);
        const s = getSession();
        if (s) setSession({ ...s, avatar_url: signed.signedUrl });
        onChange?.(signed.signedUrl);
        toast.success("Profile picture updated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    })();
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ProfileAvatar url={url} name={name} size={size} />
      <button
        type="button"
        aria-label="Upload profile picture"
        title="Upload / update profile picture"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-gold text-gold-foreground shadow ring-2 ring-navy disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); }}
      />
    </div>
  );
}
