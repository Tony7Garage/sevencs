import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AuthGate } from "@/components/AuthGate";
import { EloBadge, EloProgress } from "@/components/EloBadge";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Seven CS" },
      {
        name: "description",
        content: "Veja seu ID, elo, pontos, K/D médio, vitórias, derrotas e histórico de partidas.",
      },
      { property: "og:title", content: "Perfil do jogador — Seven CS" },
      {
        property: "og:description",
        content: "Estatísticas completas e histórico de partidas do seu perfil Seven CS.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AuthGate>
      <ProfilePage />
    </AuthGate>
  ),
});

function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading, refetch } = useProfile();

  const { data: matches } = useQuery({
    queryKey: ["matches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">Carregando…</p>;
  }
  if (!profile) {
    return (
      <p className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">
        Perfil não encontrado.
      </p>
    );
  }

  const kd =
    profile.total_deaths > 0
      ? Math.round((profile.total_kills / profile.total_deaths) * 100) / 100
      : profile.total_kills;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <section className="panel rounded-lg p-6">
        <div className="flex flex-wrap items-center gap-4">
          <PlayerAvatar name={profile.display_name} url={profile.avatar_url} className="size-16" />
          <div className="min-w-0">
            <h1 className="title-caps text-xl">{profile.display_name}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              ID do jogador:{" "}
              <button
                className="font-mono text-primary"
                onClick={() => {
                  navigator.clipboard.writeText(profile.player_id);
                  toast.success("ID copiado.");
                }}
              >
                {profile.player_id}
              </button>
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <EloBadge elo={profile.elo} />
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Atualizar
            </Button>
          </div>
        </div>
        <EloProgress elo={profile.elo} points={profile.points} className="mt-6" />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="K/D médio" value={String(kd)} />
        <Stat label="Vitórias" value={String(profile.wins)} />
        <Stat label="Derrotas" value={String(profile.losses)} />
        <Stat label="Pontos" value={String(profile.points)} />
      </section>

      <section className="panel rounded-lg p-6">
        <h2 className="title-caps text-sm text-muted-foreground">Histórico de partidas</h2>
        {!matches?.length ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhuma partida registrada ainda. Use o Simulador de Rank.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {matches.map((match) => (
              <li key={match.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span
                  className={
                    match.result === "win"
                      ? "font-semibold text-primary"
                      : "font-semibold text-destructive"
                  }
                >
                  {match.result === "win" ? "Vitória" : "Derrota"}
                </span>
                <span className="text-muted-foreground">
                  {match.kills}/{match.deaths} · K/D {match.kd}
                </span>
                <span className="text-muted-foreground">
                  {match.elo_before} → {match.elo_after}
                </span>
                <span className="ml-auto flex items-center gap-3">
                  {Number(match.multiplier) > 1 && (
                    <span className="text-xs text-primary">{match.multiplier}x</span>
                  )}
                  <span
                    className={
                      match.points_delta >= 0 ? "font-semibold text-primary" : "font-semibold text-destructive"
                    }
                  >
                    {match.points_delta >= 0 ? "+" : ""}
                    {match.points_delta}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(match.created_at).toLocaleString("pt-BR")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel rounded-lg p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
