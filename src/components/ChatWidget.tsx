import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Send, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WHATSAPP_URL } from "./WhatsAppButton";

type Msg = { id: string; sender: string; body: string | null; image_url: string | null; created_at: string };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("su_conv") : null;
    if (saved) setConvId(saved);
  }, []);

  useEffect(() => {
    if (!convId) return;
    void supabase.from("chat_messages").select("*").eq("conversation_id", convId).order("created_at").then(({ data }) => {
      if (data) setMsgs(data as Msg[]);
    });
    const ch = supabase
      .channel(`chat-${convId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${convId}` }, (payload) => {
        setMsgs((m) => [...m, payload.new as Msg]);
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [convId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  const startChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ visitor_name: form.name, visitor_phone: form.phone, visitor_email: form.email || null })
      .select("id")
      .single();
    if (error || !data) return;
    localStorage.setItem("su_conv", data.id);
    setConvId(data.id);
    await supabase.from("chat_messages").insert({
      conversation_id: data.id,
      sender: "system",
      body: "Thank you for contacting Smart Ushering. Our team has been notified and will respond shortly.",
    });
  };

  const send = async () => {
    if (!convId || (!input.trim() && !fileRef.current?.files?.[0])) return;
    setSending(true);
    let image_url: string | null = null;
    const file = fileRef.current?.files?.[0];
    if (file) {
      const path = `${convId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("chat-uploads").upload(path, file);
      if (!upErr) {
        const { data: signed } = await supabase.storage.from("chat-uploads").createSignedUrl(path, 60 * 60 * 24 * 365);
        image_url = signed?.signedUrl ?? null;
      }
    }
    await supabase.from("chat_messages").insert({ conversation_id: convId, sender: "visitor", body: input.trim() || null, image_url });
    await supabase.from("chat_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", convId);
    setInput("");
    if (fileRef.current) fileRef.current.value = "";
    setSending(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Live chat"
        className="fixed bottom-5 left-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-navy text-gold shadow-luxury transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 left-5 z-50 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border bg-card shadow-luxury">
          <div className="gradient-navy px-4 py-3 text-primary-foreground">
            <div className="font-display text-lg font-semibold text-gold">Smart Ushering Chat</div>
            <div className="text-xs text-primary-foreground/70">We typically reply within minutes</div>
          </div>

          {!convId ? (
            <form onSubmit={startChat} className="flex flex-1 flex-col gap-3 p-4">
              <p className="text-xs text-muted-foreground">Tell us a bit about you to start chatting.</p>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name *" className="rounded-md border px-3 py-2 text-sm" />
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone *" className="rounded-md border px-3 py-2 text-sm" />
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (optional)" className="rounded-md border px-3 py-2 text-sm" />
              <button className="mt-auto rounded-md bg-navy py-2.5 text-sm font-semibold text-primary-foreground">Start chat</button>
              <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="text-center text-xs text-muted-foreground underline">or continue on WhatsApp</a>
            </form>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-cream p-3">
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "visitor" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender === "visitor" ? "bg-navy text-primary-foreground" : m.sender === "system" ? "bg-gold/20 text-navy" : "bg-white text-foreground border"}`}>
                      {m.image_url && <img src={m.image_url} alt="" className="mb-1 max-h-40 rounded-md" />}
                      {m.body}
                    </div>
                  </div>
                ))}
                <div className="pt-2 text-center">
                  <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="text-xs text-[#25D366] underline">For instant response, continue on WhatsApp</a>
                </div>
              </div>
              <div className="flex items-center gap-2 border-t p-2">
                <button onClick={() => fileRef.current?.click()} className="p-2 text-muted-foreground hover:text-navy"><ImageIcon className="h-5 w-5" /></button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={() => send()} />
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message" className="flex-1 rounded-md border px-3 py-2 text-sm" />
                <button onClick={send} disabled={sending} className="grid h-9 w-9 place-items-center rounded-md bg-navy text-primary-foreground disabled:opacity-50"><Send className="h-4 w-4" /></button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
