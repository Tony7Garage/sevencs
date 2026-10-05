import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { adminV3PendingMatches, adminV3ReviewMatch, adminV3Unlock } from "@/lib/adminV3.functions";

export function AdminPanelV3() {
  const unlock = useServerFn(adminV3Unlock);
  const pending = useServerFn(adminV3PendingMatches);
  const review = useServerFn(adminV3ReviewMatch);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
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

  async function load() {
    const rows = await pending({ data: { code } });
    setMatches(rows as any[]);
  }
  async function handleUnlock() {
    setBusy(true);
    try { await unlock({ data: { code } }); setUnlocked(true); await load(); toast.success("Painel liberado."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Acesso negado."); }
    finally { setBusy(false); }
  }
  async function handleReview(id: string, decision: "approved" | "invalid", result?: "win" | "loss", kills?: number, deaths?: number) {
    setBusy(true);
    try { await review({ data: { code, matchId: id, decision, result, kills, deaths } }); await load(); toast.success(decision === "approved" ? "Partida aprovada e aplicada." : "Partida invalidada."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível revisar."); }
    finally { setBusy(false); }
  }

  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle className="title-caps text-primary">Seven CS V3 · Painel Admin</DialogTitle></DialogHeader>{!unlocked ? <div className="space-y-3"><Label htmlFor="v3-admin-password">Senha administrativa</Label><Input id="v3-admin-password" type="password" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void handleUnlock(); }} placeholder="••••••••" /><p className="text-xs text-muted-foreground">A senha é validada somente no servidor.</p><Button className="w-full" onClick={() => void handleUnlock()} disabled={busy}>Entrar no painel</Button></div> : <div className="space-y-4"><div className="flex items-center justify-between"><div><h3 className="title-caps">Partidas aguardando análise</h3><p className="text-xs text-muted-foreground">Aprovação atualiza Elo, pontos, vitórias e K/D. Invalidar não altera estatísticas.</p></div><Button variant="secondary" onClick={() => void load()} disabled={busy}>Atualizar</Button></div>{matches.length === 0 && <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">Nenhuma partida pendente.</p>}{matches.map(match => <MatchReview key={match.id} match={match} busy={busy} onReview={handleReview} />)}</div>}</DialogContent></Dialog>;
}

function MatchReview({ match, busy, onReview }: { match: any; busy: boolean; onReview: (id: string, decision: "approved" | "invalid", result?: "win" | "loss", kills?: number, deaths?: number) => Promise<void> }) {
  const [result, setResult] = useState<"win" | "loss">(match.submitted_result ?? match.result);
  const [kills, setKills] = useState(String(match.submitted_kills ?? match.kills ?? 0));
  const [deaths, setDeaths] = useState(String(match.submitted_deaths ?? match.deaths ?? 0));
  return <article className="rounded-lg border border-border bg-surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{match.profiles?.display_name ?? "Jogador"}</p><p className="font-mono text-xs text-muted-foreground">ID {match.profiles?.player_id ?? "—"}</p></div>{match.screenshot_url && <a href={match.screenshot_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Abrir print</a>}</div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div><Label>Resultado</Label><div className="mt-1 flex gap-2"><Button size="sm" variant={result === "win" ? "default" : "secondary"} onClick={() => setResult("win")}>Vitória</Button><Button size="sm" variant={result === "loss" ? "default" : "secondary"} onClick={() => setResult("loss")}>Derrota</Button></div></div><div><Label>Kills</Label><Input className="mt-1" type="number" value={kills} onChange={e => setKills(e.target.value)} /></div><div><Label>Deaths</Label><Input className="mt-1" type="number" value={deaths} onChange={e => setDeaths(e.target.value)} /></div></div><div className="mt-4 flex gap-2"><Button onClick={() => void onReview(match.id, "approved", result, Number(kills), Number(deaths))} disabled={busy}>Aprovar e aplicar</Button><Button variant="destructive" onClick={() => void onReview(match.id, "invalid")} disabled={busy}>Invalidar</Button></div></article>;
}
