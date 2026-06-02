import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Send, Download } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout, useAdminToken } from "@/components/AdminLayout";
import { adminListChats, adminSendChatMessage } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

type Msg = { id: string; sender: string; body: string | null; image_url: string | null; created_at: string };

export const Route = createFileRoute("/admin/chats")({
  head: () => ({ meta: [{ title: "Live Chats — Admin" }] }),
  component: Page,
});

function Page() {
  const token = useAdminToken();
  const qc = useQueryClient();
  const list = useServerFn(adminListChats);
  const send = useServerFn(adminSendChatMessage);
  const { data: chats } = useQuery({ queryKey: ["admin-chats", token], queryFn: () => list({ data: { token: token! } }), enabled: !!token, refetchInterval: 5000 });
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chats && !active && chats.length > 0) setActive(chats[0].id);
  }, [chats, active]);

  useEffect(() => {
    if (!active) return;
    void supabase.from("chat_messages").select("*").eq("conversation_id", active).order("created_at").then(({ data }) => {
      if (data) setMsgs(data as Msg[]);
    });
    const ch = supabase.channel(`admin-${active}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${active}` }, (p) => {
        setMsgs((m) => [...m, p.new as Msg]);
        qc.invalidateQueries({ queryKey: ["admin-chats"] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [active, qc]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [msgs.length]);

  if (!token) return null;

  const submit = async () => {
    if (!active || !input.trim()) return;
    try { await send({ data: { token, conversation_id: active, body: input } }); setInput(""); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const activeChat = chats?.find((c) => c.id === active);

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-semibold text-navy">Live Chats</h1>
      <div className="mt-4 grid h-[calc(100vh-12rem)] grid-cols-1 gap-4 md:grid-cols-3">
        <aside className="overflow-y-auto rounded-xl border bg-white">
          {chats?.length === 0 && <div className="p-6 text-sm text-muted-foreground">No chats yet.</div>}
          {chats?.map((c) => (
            <button key={c.id} onClick={() => setActive(c.id)} className={`block w-full border-b p-3 text-left text-sm hover:bg-cream ${active === c.id ? "bg-cream" : ""}`}>
              <div className="font-semibold text-navy">{c.visitor_name}</div>
              <div className="text-xs text-muted-foreground">{c.visitor_phone}</div>
              <div className="text-[10px] text-muted-foreground">{new Date(c.last_message_at).toLocaleString()}</div>
            </button>
          ))}
        </aside>

        <div className="flex flex-col rounded-xl border bg-white md:col-span-2">
          {activeChat ? (
            <>
              <div className="border-b p-3">
                <div className="font-semibold text-navy">{activeChat.visitor_name}</div>
                <div className="text-xs text-muted-foreground">{activeChat.visitor_phone} {activeChat.visitor_email && `· ${activeChat.visitor_email}`}</div>
              </div>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-cream p-4">
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${m.sender === "admin" ? "bg-navy text-primary-foreground" : m.sender === "system" ? "bg-gold/20 text-navy" : "border bg-white"}`}>
                      {m.image_url && (
                        <div className="mb-1">
                          <img src={m.image_url} alt="" className="max-h-60 rounded-md" />
                          <a href={m.image_url} download className="mt-1 inline-flex items-center gap-1 text-[10px] underline"><Download className="h-3 w-3" /> Download</a>
                        </div>
                      )}
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 border-t p-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Reply..." className="flex-1 rounded-md border px-3 py-2 text-sm" />
                <button onClick={submit} className="grid h-9 w-9 place-items-center rounded-md bg-navy text-primary-foreground"><Send className="h-4 w-4" /></button>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Select a conversation</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
