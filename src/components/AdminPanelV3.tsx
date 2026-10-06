import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { adminV3ListAdminAccess, adminV3PendingMatches, adminV3ReviewMatch, adminV3SetAdminAccess, adminV3Unlock } from "@/lib/adminV3.functions";

export function AdminPanelV3() {
  const unlock = useServerFn(adminV3Unlock);
  const listAccess = useServerFn(adminV3ListAdminAccess);
  const setAccess = useServerFn(adminV3SetAdminAccess);
  const pending = useServerFn(adminV3PendingMatches);
  const review = useServerFn(adminV3ReviewMatch);
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [accessList, setAccessList] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey && (event.key === "7" || event.code === "Digit7")) {
        event.preventDefault(); setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || unlocked) return;
    void handleOpenPanel();
  }, [open]);

  async function handleOpenPanel() {
    setBusy(true);
    try {
      await unlock({ data: undefined });
      setUnlocked(true);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Acesso negado.");
    } finally { setBusy(false); }
  }

  async function load() {
    const [access, rows] = await Promise.all([listAccess({ data: undefined }), pending({ data: undefined })]);
    setAccessList(access as any[]);
    setMatches(rows as any[]);
  }

  async function handleAccessChange(playerId: string, enabled: boolean) {
    setBusy(true);
    try {
      await setAccess({ data: { playerId, enabled } });
      await load();
      toast.success(enabled ? `ID ${playerId} agora pode usar o painel.` : `Acesso do ID ${playerId} removido.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar o acesso.");
    } finally { setBusy(false); }
  }

  async function handleReview(id: string, decision: "approved" | "invalid", result?: "win" | "loss", kills?: number, deaths?: number) {
    setBusy(true);
    try {
      await review({ data: { matchId: id, decision, result, kills, deaths } });
      await load();
      toast.success(decision === "approved" ? "Partida aprovada e aplicada." : "Partida invalidada.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível revisar."); }
    finally { setBusy(false); }
  }

  function handleClose(value: boolean) {
    setOpen(value);
    if (!value) setUnlocked(false);
  }

  return <Dialog open={open} onOpenChange={handleClose}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle className="title-caps text-primary">Seven CS V3 · Painel Admin</DialogTitle></DialogHeader>{!unlocked ? <div className="space-y-3"><p className="text-sm text-muted-foreground">Verificando seu ID e suas permissões administrativas...</p>{busy && <p className="text-xs text-muted-foreground">Aguarde...</p>}</div> : <div className="space-y-6"><section className="space-y-3"><div><h3 className="title-caps">Quem pode usar o Painel Admin</h3><p className="text-xs text-muted-foreground">O acesso é controlado diretamente pelo ID do jogador. Não existe senha.</p></div><div className="space-y-2">{accessList.map(user => <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"><div><p className="font-semibold">{user.display_name}</p><p className="font-mono text-xs text-muted-foreground">ID {user.player_id}</p></div><Button size="sm" variant={user.canAccess ? "default" : "secondary"} onClick={() => void handleAccessChange(user.player_id, !user.canAccess)} disabled={busy || user.id === accessList.find(item => item.canAccess && item.id === user.id)?.id && accessList.filter(item => item.canAccess).length === 1}>{user.canAccess ? "🟢 Admin · Remover acesso" : "🔴 Sem acesso · Liberar"}</Button></div>)}{accessList.length === 0 && <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">Nenhum usuário encontrado.</p>}</div></section><section className="space-y-4"><div className="flex items-center justify-between"><div><h3 className="title-caps">Partidas aguardando análise</h3><p className="text-xs text-muted-foreground">Aprovação atualiza Elo, pontos, vitórias e K/D. Invalidar não altera estatísticas.</p></div><Button variant="secondary" onClick={() => void load()} disabled={busy}>Atualizar</Button></div>{matches.length === 0 && <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">Nenhuma partida pendente.</p>}{matches.map(match => <MatchReview key={match.id} match={match} busy={busy} onReview={handleReview} />)}</section></div>}</DialogContent></Dialog>;
}

function MatchReview({ match, busy, onReview }: { match: any; busy: boolean; onReview: (id: string, decision: "approved" | "invalid", result?: "win" | "loss", kills?: number, deaths?: number) => Promise<void> }) {
  const [result, setResult] = useState<"win" | "loss">(match.submitted_result ?? match.result);
  const [kills, setKills] = useState(String(match.submitted_kills ?? match.kills ?? 0));
  const [deaths, setDeaths] = useState(String(match.submitted_deaths ?? match.deaths ?? 0));
  return <article className="rounded-lg border border-border bg-surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{match.profiles?.display_name ?? "Jogador"}</p><p className="font-mono text-xs text-muted-foreground">ID {match.profiles?.player_id ?? "—"}</p></div>{match.screenshot_url && <a href={match.screenshot_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Abrir print</a>}</div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div><Label>Resultado</Label><div className="mt-1 flex gap-2"><Button size="sm" variant={result === "win" ? "default" : "secondary"} onClick={() => setResult("win")}>Vitória</Button><Button size="sm" variant={result === "loss" ? "default" : "secondary"} onClick={() => setResult("loss")}>Derrota</Button></div></div><div><Label>Kills</Label><Input className="mt-1" type="number" value={kills} onChange={e => setKills(e.target.value)} /></div><div><Label>Deaths</Label><Input className="mt-1" type="number" value={deaths} onChange={e => setDeaths(e.target.value)} /></div></div><div className="mt-4 flex gap-2"><Button onClick={() => void onReview(match.id, "approved", result, Number(kills), Number(deaths))} disabled={busy}>Aprovar e aplicar</Button><Button variant="destructive" onClick={() => void onReview(match.id, "invalid")} disabled={busy}>Invalidar</Button></div></article>;
}
