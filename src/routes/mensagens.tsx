import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/mensagens")({
  head: () => ({ meta: [{ title: "Mensagens — Seven CS" }] }),
  component: () => <AuthGate><MessagesPage /></AuthGate>,
});

function MessagesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [target, setTarget] = useState("");
  const [conversation, setConversation] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: messages = [] } = useQuery({
    queryKey: ["dm-messages", conversation], enabled: !!conversation,
    queryFn: async () => {
      const { data, error } = await supabase.from("dm_messages").select("id, user_id, content, created_at").eq("conversation_id", conversation!).order("created_at", { ascending: true }).limit(200);
      if (error) throw error; return data ?? [];
    },
  });

  useEffect(() => {
    if (!conversation) return;
    const ch = supabase.channel(`dm-${conversation}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversation}` }, () => void qc.invalidateQueries({ queryKey: ["dm-messages", conversation] })).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [conversation, qc]);

  async function openConversation() {
    const id = target.trim();
    if (!id) return;
    setBusy(true);
    try {
      const { data: profile, error } = await supabase.from("profiles").select("id, display_name, player_id").eq("player_id", id).maybeSingle();
      if (error) throw error;
      if (!profile || profile.id === user!.id) throw new Error("Jogador não encontrado ou inválido.");
      const { data: mine } = await supabase.from("dm_members").select("conversation_id").eq("user_id", user!.id);
      for (const row of mine ?? []) {
        const { data: other } = await supabase.from("dm_members").select("user_id").eq("conversation_id", row.conversation_id).eq("user_id", profile.id).maybeSingle();
        if (other) { setConversation(row.conversation_id); return; }
      }
      const { data: conv, error: convError } = await supabase.from("dm_conversations").insert({}).select("id").single();
      if (convError) throw convError;
      const { error: memberError } = await supabase.from("dm_members").insert([{ conversation_id: conv.id, user_id: user!.id }, { conversation_id: conv.id, user_id: profile.id }]);
      if (memberError) throw memberError;
      setConversation(conv.id); setTarget("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível abrir a conversa."); }
    finally { setBusy(false); }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault(); const content = text.trim(); if (!content || !conversation) return;
    const { error } = await supabase.from("dm_messages").insert({ conversation_id: conversation, user_id: user!.id, content });
    if (error) toast.error(error.message); else { setText(""); await qc.invalidateQueries({ queryKey: ["dm-messages", conversation] }); }
  }

  return <div className="mx-auto max-w-3xl space-y-6 px-4 py-10"><header><h1 className="title-caps text-2xl">Mensagens privadas</h1><p className="mt-2 text-sm text-muted-foreground">Converse diretamente com outro jogador pelo ID Seven CS.</p></header><section className="panel rounded-lg p-5"><div className="flex gap-2"><Input value={target} onChange={e => setTarget(e.target.value)} placeholder="ID do jogador, ex.: 0002" className="font-mono" /><Button onClick={() => void openConversation()} disabled={busy}>Abrir conversa</Button></div></section>{conversation && <section className="panel flex h-[55vh] flex-col rounded-lg"><div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.map(m => <div key={m.id} className={`max-w-[80%] rounded-md border border-border p-3 text-sm ${m.user_id === user!.id ? "ml-auto bg-primary/10" : "bg-surface-2"}`}><p>{m.content}</p><span className="mt-1 block text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></div>)}</div><form onSubmit={send} className="flex gap-2 border-t border-border p-3"><Input value={text} maxLength={500} onChange={e => setText(e.target.value)} placeholder="Mensagem privada…" /><Button type="submit" size="icon" aria-label="Enviar"><Send className="size-4" /></Button></form></section>}</div>;
}
