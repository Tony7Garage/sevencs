import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthGate } from "@/components/AuthGate";
import { EloBadge } from "@/components/EloBadge";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/equipes")({
  head: () => ({
    meta: [
      { title: "Monte sua Equipe — Seven CS" },
      {
        name: "description",
        content:
          "Crie sua equipe no Seven CS, gere um código único, convide jogadores e veja os integrantes.",
      },
      { property: "og:title", content: "Monte sua Equipe — Seven CS" },
      {
        property: "og:description",
        content: "Equipes com código de convite para jogar Counter-Strike com a sua galera.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AuthGate>
      <TeamsPage />
    </AuthGate>
  ),
});

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function TeamsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  const membership = useQuery({
    queryKey: ["team", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: member, error } = await supabase
        .from("team_members")
        .select("team_id, teams(id, name, code, owner_id)")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!member?.teams) return null;

      const team = member.teams as { id: string; name: string; code: string; owner_id: string };
      const { data: rows } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", team.id);

      const ids = (rows ?? []).map((row) => row.user_id);
      const { data: profiles } = ids.length
        ? await supabase
            .from("profiles")
            .select("id, display_name, avatar_url, elo, player_id")
            .in("id", ids)
        : { data: [] };

      return { team, members: profiles ?? [] };
    },
  });

  async function createTeam() {
    if (!name.trim()) {
      toast.error("Escolha um nome para a equipe.");
      return;
    }
    setBusy(true);
    try {
      let created: { id: string } | null = null;
      for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
        const { data, error } = await supabase
          .from("teams")
          .insert({ name: name.trim(), code: randomCode(), owner_id: user!.id })
          .select("id")
          .maybeSingle();
        if (!error && data) created = data;
        else if (error && !error.message.includes("duplicate")) throw error;
      }
      if (!created) throw new Error("Não foi possível gerar um código único. Tente novamente.");

      const { error: joinError } = await supabase
        .from("team_members")
        .insert({ team_id: created.id, user_id: user!.id });
      if (joinError) throw joinError;

      setName("");
      toast.success("Equipe criada!");
      await queryClient.invalidateQueries({ queryKey: ["team"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a equipe.");
    } finally {
      setBusy(false);
    }
  }

  async function joinTeam() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    try {
      const { data: team, error } = await supabase
        .from("teams")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (error) throw error;
      if (!team) throw new Error("Código não encontrado.");

      const { error: joinError } = await supabase
        .from("team_members")
        .insert({ team_id: team.id, user_id: user!.id });
      if (joinError) throw joinError;

      setJoinCode("");
      toast.success("Você entrou na equipe!");
      await queryClient.invalidateQueries({ queryKey: ["team"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  async function leaveTeam() {
    setBusy(true);
    try {
      const { error } = await supabase.from("team_members").delete().eq("user_id", user!.id);
      if (error) throw error;
      toast.success("Você saiu da equipe.");
      await queryClient.invalidateQueries({ queryKey: ["team"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível sair.");
    } finally {
      setBusy(false);
    }
  }

  const current = membership.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <h1 className="title-caps text-2xl">Monte sua Equipe</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie uma equipe e compartilhe o código, ou entre em uma equipe existente.
        </p>
      </header>

      {current ? (
        <section className="panel rounded-lg p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h2 className="title-caps text-lg">{current.team.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {current.members.length} jogador(es)
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="rounded-md border border-primary/50 bg-primary/10 px-3 py-1.5 font-mono text-sm text-primary">
                {current.team.code}
              </span>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Copiar código"
                onClick={() => {
                  navigator.clipboard.writeText(current.team.code);
                  toast.success("Código copiado.");
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
          </div>

          <ul className="mt-6 divide-y divide-border">
            {current.members.map((profile) => {
              return (
                <li key={profile.id} className="flex items-center gap-3 py-3">
                  <PlayerAvatar
                    name={profile.display_name}
                    url={profile.avatar_url}
                    className="size-9"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {profile.display_name}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{profile.player_id}</p>
                  </div>
                  <EloBadge elo={profile.elo} className="ml-auto" />
                </li>
              );
            })}
          </ul>

          <Button variant="secondary" className="mt-6" onClick={leaveTeam} disabled={busy}>
            Sair da equipe
          </Button>
        </section>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="panel space-y-3 rounded-lg p-6">
            <h2 className="title-caps text-sm text-muted-foreground">Criar equipe</h2>
            <Label htmlFor="team-name">Nome da equipe</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Seven Squad"
            />
            <Button className="w-full" onClick={createTeam} disabled={busy}>
              Criar e gerar código
            </Button>
          </section>

          <section className="panel space-y-3 rounded-lg p-6">
            <h2 className="title-caps text-sm text-muted-foreground">Entrar com código</h2>
            <Label htmlFor="team-code">Código da equipe</Label>
            <Input
              id="team-code"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="XXXXXX"
              className="font-mono"
            />
            <Button variant="secondary" className="w-full" onClick={joinTeam} disabled={busy}>
              Entrar na equipe
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}
