import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AuthGate } from "@/components/AuthGate";
import { EloBadge, EloProgress } from "@/components/EloBadge";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel do jogador — Seven CS" },
      {
        name: "description",
        content:
          "Painel Seven CS com seu elo, pontos, K/D, últimas partidas e atalhos para simulador, equipes e comunidade.",
      },
      { property: "og:title", content: "Painel do jogador — Seven CS" },
      {
        property: "og:description",
        content: "Acompanhe seu progresso de elo e suas últimas partidas no Seven CS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AuthGate>
      <DashboardPage />
    </AuthGate>
  ),
});

function DashboardPage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();

  const { data: matches } = useQuery({
    queryKey: ["matches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !profile) {
    return (
      <p className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">Carregando…</p>
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
          <PlayerAvatar name={profile.display_name} url={profile.avatar_url} className="size-14" />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Bem-vindo</p>
            <h1 className="title-caps text-xl">{profile.display_name}</h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">ID {profile.player_id}</p>
          </div>
          <div className="ml-auto">
            <EloBadge elo={profile.elo} />
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

      <section className="grid gap-3 sm:grid-cols-4">
        <Button asChild>
          <Link to="/simulador">Registrar partida</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/equipes">Minha equipe</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/chat">Comunidade</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/configuracoes">Personalizar</Link>
        </Button>
      </section>

      <section className="panel rounded-lg p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="title-caps text-sm text-muted-foreground">Últimas partidas</h2>
          <Link to="/perfil" className="text-xs text-primary hover:underline">
            Ver histórico completo
          </Link>
        </div>
        {!matches?.length ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhuma partida registrada ainda. Envie o print no Simulador de Rank.
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
                <span className="ml-auto flex items-center gap-3">
                  <span
                    className={
                      match.points_delta >= 0
                        ? "font-semibold text-primary"
                        : "font-semibold text-destructive"
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

      <p className="text-center text-xs text-muted-foreground">
        O Seven CS é um simulador independente e não altera o ranking oficial do Counter-Strike.
      </p>
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
