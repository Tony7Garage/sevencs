import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthGate } from "@/components/AuthGate";
import { EloBadge } from "@/components/EloBadge";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat Geral — Comunidade Seven CS" },
      {
        name: "description",
        content:
          "Converse com a comunidade Seven CS no chat geral: veja avatar, nome e elo de cada jogador.",
      },
      { property: "og:title", content: "Comunidade Seven CS" },
      {
        property: "og:description",
        content: "Chat geral da comunidade de Counter-Strike do Seven CS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AuthGate>
      <ChatPage />
    </AuthGate>
  ),
});

const CHANNEL = "geral";

type ChatMessage = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    elo: string;
  } | null;
};

function ChatPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ["messages", CHANNEL],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, user_id, content, created_at, profiles(display_name, avatar_url, elo)")
        .eq("channel", CHANNEL)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data as unknown as ChatMessage[];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("messages-geral")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => void queryClient.invalidateQueries({ queryKey: ["messages", CHANNEL] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      const { error } = await supabase
        .from("messages")
        .insert({ user_id: user!.id, content, channel: CHANNEL });
      if (error) throw error;
      setText("");
      await queryClient.invalidateQueries({ queryKey: ["messages", CHANNEL] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header>
        <h1 className="title-caps text-2xl">Chat Geral</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Comunidade Seven CS. Novos grupos e comunidades chegam nas próximas versões.
        </p>
      </header>

      <section className="panel mt-6 flex h-[60vh] flex-col rounded-lg">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {!messages?.length && (
            <p className="text-sm text-muted-foreground">Seja o primeiro a falar algo.</p>
          )}
          {messages?.map((message) => (
            <div key={message.id} className="flex gap-3">
              <PlayerAvatar
                name={message.profiles?.display_name ?? "Jogador"}
                url={message.profiles?.avatar_url}
                className="size-9"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {message.profiles?.display_name ?? "Jogador"}
                  </span>
                  <EloBadge elo={message.profiles?.elo ?? "Bronze"} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {message.content}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
          <Input
            value={text}
            maxLength={500}
            onChange={(event) => setText(event.target.value)}
            placeholder="Escreva sua mensagem…"
          />
          <Button type="submit" size="icon" disabled={sending} aria-label="Enviar">
            <Send className="size-4" />
          </Button>
        </form>
      </section>
    </div>
  );
}
