import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/rankings")({
  head: () => ({ meta: [{ title: "Rankings — Seven CS" }] }),
  component: () => <AuthGate><RankingsPage /></AuthGate>,
});

function RankingsPage() {
  const { data: players = [], isLoading } = useQuery({
    queryKey: ["rankings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, player_id, display_name, avatar_url, elo, points, wins, losses, total_kills, total_deaths");
      if (error) throw error;
      return data ?? [];
    },
  });
  const kd = (p: typeof players[number]) => p.total_deaths > 0 ? p.total_kills / p.total_deaths : p.total_kills;
  const boards = [
    ["Top ID", [...players].sort((a,b) => Number(a.player_id) - Number(b.player_id))],
    ["Top Elo", [...players].sort((a,b) => b.points - a.points)],
    ["Top vitórias", [...players].sort((a,b) => b.wins - a.wins)],
    ["Top K/D", [...players].sort((a,b) => kd(b) - kd(a))],
  ] as const;
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-10"><header><h1 className="title-caps text-2xl">Rankings</h1><p className="mt-2 text-sm text-muted-foreground">Os melhores jogadores do Seven CS.</p></header>{isLoading ? <p>Carregando…</p> : <div className="grid gap-4 md:grid-cols-2">{boards.map(([title, list]) => <section key={title} className="panel rounded-lg p-5"><h2 className="title-caps text-sm text-muted-foreground">{title}</h2><ol className="mt-4 space-y-3">{list.slice(0,10).map((p,i) => <li key={p.id} className="flex items-center gap-3"><span className="w-6 text-center font-mono text-xs text-muted-foreground">{i+1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.display_name}</p><p className="font-mono text-xs text-muted-foreground">#{p.player_id}</p></div><span className="text-sm font-semibold">{title === "Top K/D" ? kd(p).toFixed(2) : title === "Top vitórias" ? p.wins : p.points}</span></li>)}</ol></section>)}</div>}</div>;
}
