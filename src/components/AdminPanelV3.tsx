import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { adminV3GetMultiplier, adminV3ListAdminAccess, adminV3ListUsers, adminV3PendingMatches, adminV3ReviewMatch, adminV3SetAdminAccess, adminV3SetMultiplier, adminV3Unlock, adminV3UpdatePlayer } from "@/lib/adminV3.functions";

export function AdminPanelV3() {
  const unlock = useServerFn(adminV3Unlock);
  const listUsers = useServerFn(adminV3ListUsers);
  const listAdmins = useServerFn(adminV3ListAdminAccess);
  const setAdmin = useServerFn(adminV3SetAdminAccess);
  const updatePlayer = useServerFn(adminV3UpdatePlayer);
  const pending = useServerFn(adminV3PendingMatches);
  const review = useServerFn(adminV3ReviewMatch);
  const getMultiplier = useServerFn(adminV3GetMultiplier);
  const setMultiplier = useServerFn(adminV3SetMultiplier);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"users" | "admins" | "matches" | "settings">("users");
  const [users, setUsers] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [newAdminId, setNewAdminId] = useState("");
  const [multiplierEnabled, setMultiplierEnabled] = useState(false);
  const [multiplier, setMultiplierValue] = useState("1");

  useEffect(() => {
    const onKey = async (event: KeyboardEvent) => {
      if (event.altKey && (event.key === "7" || event.code === "Digit7")) {
        event.preventDefault();
        setBusy(true);
        try {
          await unlock({ data: undefined });
          setOpen(true);
          await loadAll();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Acesso negado.");
        } finally { setBusy(false); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function loadAll() {
    const [userRows, adminRows, matchRows, multiplierRow] = await Promise.all([
      listUsers({ data: undefined }),
      listAdmins({ data: undefined }),
      pending({ data: undefined }),
      getMultiplier({ data: undefined }),
    ]);
    setUsers(userRows as any[]);
    setAdmins(adminRows as any[]);
    setMatches(matchRows as any[]);
    setMultiplierEnabled(multiplierRow.enabled);
    setMultiplierValue(String(multiplierRow.multiplier));
  }

  async function refresh() {
    setBusy(true);
    try { await loadAll(); toast.success("Painel atualizado."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível atualizar."); }
    finally { setBusy(false); }
  }

  async function handleAdmin(playerId: string, enabled: boolean) {
    setBusy(true);
    try {
      await setAdmin({ data: { playerId, enabled } });
      await loadAll();
      toast.success(enabled ? `ID ${playerId} agora é administrador.` : `ID ${playerId} deixou de ser administrador.`);
      setNewAdminId("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível alterar administrador."); }
    finally { setBusy(false); }
  }

  async function handleUpdate(data: any) {
    setBusy(true);
    try {
      await updatePlayer({ data });
      await loadAll();
      toast.success("Dados do usuário atualizados.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o usuário."); }
    finally { setBusy(false); }
  }

  async function handleReview(id: string, decision: "approved" | "invalid", result?: "win" | "loss", kills?: number, deaths?: number) {
    setBusy(true);
    try {
      await review({ data: { matchId: id, decision, result, kills, deaths } });
      await loadAll();
      toast.success(decision === "approved" ? "Partida aprovada e aplicada." : "Partida invalidada.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível revisar."); }
    finally { setBusy(false); }
  }

  async function handleMultiplier() {
    const value = Number(multiplier.replace(",", "."));
    if (!Number.isFinite(value) || value < 1 || value > 100) { toast.error("Use um multiplicador entre 1x e 100x."); return; }
    setBusy(true);
    try {
      const saved = await setMultiplier({ data: { enabled: multiplierEnabled, multiplier: value } });
      setMultiplierEnabled(saved.enabled);
      setMultiplierValue(String(saved.multiplier));
      toast.success(saved.enabled ? `Multiplicador global definido em ${saved.multiplier}x.` : "Multiplicador global desativado.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar o multiplicador."); }
    finally { setBusy(false); }
  }

  const filteredUsers = users.filter(user => {
    const q = search.trim().toLowerCase();
    return !q || String(user.player_id).includes(q) || String(user.display_name ?? "").toLowerCase().includes(q) || String(user.steam_name ?? "").toLowerCase().includes(q);
  });
  const adminIds = new Set(admins.map(admin => admin.player_id));

  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl"><DialogHeader><div className="flex items-center justify-between gap-3"><DialogTitle className="title-caps text-primary">Seven CS · Painel Admin</DialogTitle><Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={busy}>Atualizar</Button></div></DialogHeader>
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2"><Stat label="Usuários" value={users.length} /><Stat label="Online" value={users.filter(u => u.online).length} /><Stat label="Pendentes" value={matches.length} /></div>
      <div className="flex flex-wrap gap-2 border-b border-border pb-2"><Button variant={tab === "users" ? "default" : "secondary"} onClick={() => setTab("users")}>Usuários</Button><Button variant={tab === "admins" ? "default" : "secondary"} onClick={() => setTab("admins")}>Administradores</Button><Button variant={tab === "matches" ? "default" : "secondary"} onClick={() => setTab("matches")}>Partidas</Button><Button variant={tab === "settings" ? "default" : "secondary"} onClick={() => setTab("settings")}>Multiplicador</Button></div>
      {tab === "users" && <section className="space-y-3"><Input placeholder="Buscar por ID, nome ou Steam..." value={search} onChange={e => setSearch(e.target.value)} />{filteredUsers.length === 0 ? <Empty text="Nenhum usuário encontrado." /> : filteredUsers.map(user => <UserEditor key={user.id} user={user} isAdmin={adminIds.has(user.player_id)} busy={busy} onSave={handleUpdate} />)}</section>}
      {tab === "admins" && <section className="space-y-4"><div className="rounded-lg border border-border p-4"><h3 className="title-caps">Adicionar administrador</h3><p className="mb-3 text-xs text-muted-foreground">Digite o ID de um usuário existente. O ID 535226 é o administrador principal e não pode ser removido.</p><div className="flex gap-2"><Input inputMode="numeric" placeholder="ID do usuário" value={newAdminId} onChange={e => setNewAdminId(e.target.value)} /><Button disabled={busy || !newAdminId} onClick={() => void handleAdmin(newAdminId, true)}>Adicionar</Button></div></div>{admins.length === 0 ? <Empty text="Nenhum administrador secundário cadastrado." /> : admins.map(admin => <div key={admin.player_id} className="flex items-center justify-between rounded-lg border border-border p-4"><div><p className="font-semibold">ID {admin.player_id}</p><p className="text-xs text-muted-foreground">{admin.player_id === "535226" ? "Administrador principal" : "Administrador"}</p></div>{admin.player_id !== "535226" && <Button variant="destructive" size="sm" disabled={busy} onClick={() => void handleAdmin(admin.player_id, false)}>Remover</Button>}</div>)}</section>}
      {tab === "matches" && <section className="space-y-3">{matches.length === 0 ? <Empty text="Nenhuma partida pendente." /> : matches.map(match => <MatchReview key={match.id} match={match} busy={busy} onReview={handleReview} />)}</section>}
      {tab === "settings" && <section className="space-y-4"><div className="rounded-lg border border-border p-5"><h3 className="title-caps">Multiplicador global de pontos</h3><p className="mt-2 text-sm text-muted-foreground">Quando ativado, todos os usuários recebem os pontos da partida multiplicados pelo valor escolhido. Ex.: 2x transforma +100 em +200.</p><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><Label>Multiplicador</Label><Input className="mt-1" inputMode="decimal" placeholder="2" value={multiplier} onChange={e => setMultiplierValue(e.target.value)} /><p className="mt-1 text-xs text-muted-foreground">Aceita de 1x até 100x.</p></div><div className="flex items-end gap-2"><Button variant={multiplierEnabled ? "default" : "secondary"} onClick={() => setMultiplierEnabled(v => !v)}>{multiplierEnabled ? "Multiplicador ativado" : "Multiplicador desativado"}</Button><Button disabled={busy} onClick={() => void handleMultiplier()}>Salvar</Button></div></div></div></section>}
    </div>
  </DialogContent></Dialog>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-border bg-surface p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold text-primary">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{text}</p>; }

function UserEditor({ user, isAdmin, busy, onSave }: { user: any; isAdmin: boolean; busy: boolean; onSave: (data: any) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [playerId, setPlayerId] = useState(user.player_id);
  const [name, setName] = useState(user.display_name ?? "");
  const [steamName, setSteamName] = useState(user.steam_name ?? "");
  const [elo, setElo] = useState(user.elo ?? "Bronze");
  const [points, setPoints] = useState(String(user.points ?? 0));
  const [wins, setWins] = useState(String(user.wins ?? 0));
  const [losses, setLosses] = useState(String(user.losses ?? 0));
  const [kills, setKills] = useState(String(user.total_kills ?? 0));
  const [deaths, setDeaths] = useState(String(user.total_deaths ?? 0));
  return <article className="rounded-lg border border-border bg-surface p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${user.online ? "bg-green-500" : "bg-muted-foreground"}`} /><p className="font-semibold">{user.display_name || "Jogador"}</p>{isAdmin && <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">ADMIN</span>}</div><p className="font-mono text-xs text-muted-foreground">ID {user.player_id} · {user.online ? "Online" : "Offline"}</p><p className="text-xs text-muted-foreground">Steam: {user.steam_name || "Não informado"}</p><p className="text-xs text-muted-foreground">Última atividade: {user.last_seen ? new Date(user.last_seen).toLocaleString("pt-BR") : "Nunca registrada"}</p></div><Button variant="secondary" size="sm" onClick={() => setEditing(v => !v)}>{editing ? "Fechar" : "Editar conta"}</Button></div>{editing && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label="ID" value={playerId} setValue={setPlayerId} /><Field label="Nome Seven CS" value={name} setValue={setName} /><Field label="Gamer Tag Steam" value={steamName} setValue={setSteamName} /><Field label="Patente / Elo" value={elo} setValue={setElo} /><Field label="Pontos" value={points} setValue={setPoints} type="number" /><Field label="Vitórias" value={wins} setValue={setWins} type="number" /><Field label="Derrotas" value={losses} setValue={setLosses} type="number" /><Field label="Kills" value={kills} setValue={setKills} type="number" /><Field label="Deaths" value={deaths} setValue={setDeaths} type="number" /><div className="sm:col-span-2 lg:col-span-4 flex justify-end"><Button disabled={busy} onClick={() => void onSave({ playerId: user.player_id, newPlayerId: playerId, displayName: name, steamName, elo, points: Number(points), wins: Number(wins), losses: Number(losses), totalKills: Number(kills), totalDeaths: Number(deaths) })}>Salvar alterações</Button></div></div>}</article>;
}

function Field({ label, value, setValue, type = "text" }: { label: string; value: string; setValue: (value: string) => void; type?: string }) { return <div><Label>{label}</Label><Input className="mt-1" type={type} value={value} onChange={e => setValue(e.target.value)} /></div>; }

function MatchReview({ match, busy, onReview }: { match: any; busy: boolean; onReview: (id: string, decision: "approved" | "invalid", result?: "win" | "loss", kills?: number, deaths?: number) => Promise<void> }) {
  const [result, setResult] = useState<"win" | "loss">(match.submitted_result ?? match.result);
  const [kills, setKills] = useState(String(match.submitted_kills ?? match.kills ?? ""));
  const [deaths, setDeaths] = useState(String(match.submitted_deaths ?? match.deaths ?? ""));
  return <article className="rounded-lg border border-border bg-surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{match.profiles?.display_name ?? "Jogador"}</p><p className="font-mono text-xs text-muted-foreground">ID {match.profiles?.player_id ?? "—"}</p><p className="text-sm text-primary">Steam: {match.profiles?.steam_name ?? "Não informado"}</p><p className="mt-1 text-sm font-semibold">KD informado pelo jogador: {Number(match.submitted_kd ?? match.kd ?? 0).toFixed(2)}</p></div>{match.screenshot_url && <a href={match.screenshot_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Abrir print</a>}</div><p className="mt-3 text-xs text-muted-foreground">Confira manualmente no print se a Gamer Tag da Steam aparece entre os jogadores e se o KD informado corresponde a ela. Depois preencha kills/deaths verificados.</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><div><Label>Resultado</Label><div className="mt-1 flex gap-2"><Button size="sm" variant={result === "win" ? "default" : "secondary"} onClick={() => setResult("win")}>Vitória</Button><Button size="sm" variant={result === "loss" ? "default" : "secondary"} onClick={() => setResult("loss")}>Derrota</Button></div></div><div><Label>Kills verificados</Label><Input className="mt-1" type="number" min="0" value={kills} onChange={e => setKills(e.target.value)} /></div><div><Label>Deaths verificados</Label><Input className="mt-1" type="number" min="0" value={deaths} onChange={e => setDeaths(e.target.value)} /></div></div><div className="mt-4 flex gap-2"><Button onClick={() => void onReview(match.id, "approved", result, Number(kills), Number(deaths))} disabled={busy || kills === "" || deaths === ""}>Aprovar e aplicar</Button><Button variant="destructive" onClick={() => void onReview(match.id, "invalid")} disabled={busy}>Invalidar</Button></div></article>;
}
