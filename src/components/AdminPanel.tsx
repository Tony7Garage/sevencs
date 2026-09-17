import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { EloBadge } from "@/components/EloBadge";
import { ELOS, type Elo } from "@/lib/elo";
import {
  adminAdjustPlayer,
  adminFindPlayer,
  adminSetMultiplier,
  adminUnlock,
} from "@/lib/admin.functions";
import { useAuth } from "@/hooks/useAuth";

type PlayerRow = {
  id: string;
  player_id: string;
  display_name: string;
  elo: string;
  points: number;
  wins: number;
  losses: number;
};

type MatchRow = {
  id: string;
  result: string;
  kills: number;
  deaths: number;
  kd: number;
  points_delta: number;
  created_at: string;
};

/** Painel oculto: ALT + 7 abre, o código libera o acesso. */
export function AdminPanel() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [query, setQuery] = useState("");
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [amount, setAmount] = useState("10");
  const [multiplierEnabled, setMultiplierEnabled] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [busy, setBusy] = useState(false);

  const unlock = useServerFn(adminUnlock);
  const find = useServerFn(adminFindPlayer);
  const adjust = useServerFn(adminAdjustPlayer);
  const setMult = useServerFn(adminSetMultiplier);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey && (event.key === "7" || event.code === "Digit7")) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleUnlock() {
    if (!session) {
      toast.error("Entre na sua conta para usar o painel.");
      return;
    }
    setBusy(true);
    try {
      const result = await unlock({ data: { code } });
      setUnlocked(true);
      setMultiplierEnabled(result.multiplierEnabled);
      setMultiplier(result.multiplier);
    } catch {
      toast.error("Código inválido.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFind() {
    setBusy(true);
    try {
      const result = await find({ data: { code, playerId: query } });
      setPlayer(result.profile as PlayerRow);
      setMatches(result.matches as MatchRow[]);
    } catch (error) {
      setPlayer(null);
      setMatches([]);
      toast.error(error instanceof Error ? error.message : "Erro na busca.");
    } finally {
      setBusy(false);
    }
  }

  async function runAdjust(action: "add" | "subtract" | "set" | "elo", elo?: Elo) {
    if (!player) return;
    setBusy(true);
    try {
      const result = await adjust({
        data: {
          code,
          playerId: player.player_id,
          action,
          amount: Number(amount) || 0,
          elo,
        },
      });
      setPlayer({ ...player, elo: result.elo, points: result.points });
      toast.success("Jogador atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMultiplier(enabled: boolean, value: number) {
    setBusy(true);
    try {
      await setMult({ data: { code, enabled, multiplier: value } });
      setMultiplierEnabled(enabled);
      setMultiplier(value);
      toast.success(enabled ? `Multiplicador global ${value}x ativo.` : "Multiplicador desativado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="title-caps text-primary">Painel administrativo</DialogTitle>
        </DialogHeader>

        {!unlocked ? (
          <div className="space-y-3">
            <Label htmlFor="admin-code">Código de acesso</Label>
            <Input
              id="admin-code"
              type="password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleUnlock()}
              placeholder="••••••••"
            />
            <Button onClick={handleUnlock} disabled={busy} className="w-full">
              Liberar acesso
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="title-caps text-sm text-muted-foreground">Multiplicador global</h3>
              <div className="flex items-center justify-between rounded-md border border-border bg-surface p-3">
                <span className="text-sm">Aplicar a todas as novas partidas</span>
                <Switch
                  checked={multiplierEnabled}
                  onCheckedChange={(checked) => saveMultiplier(checked, multiplier)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={multiplier === value ? "default" : "secondary"}
                    onClick={() => saveMultiplier(multiplierEnabled, value)}
                    disabled={busy}
                  >
                    {value}x
                  </Button>
                ))}
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="title-caps text-sm text-muted-foreground">Buscar jogador por ID</h3>
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ex.: 048213"
                />
                <Button onClick={handleFind} disabled={busy}>
                  Buscar
                </Button>
              </div>

              {player && (
                <div className="space-y-4 rounded-md border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{player.display_name}</p>
                      <p className="text-xs text-muted-foreground">ID {player.player_id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <EloBadge elo={player.elo} />
                      <span className="text-sm text-muted-foreground">{player.points} pts</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <div className="w-24">
                      <Label htmlFor="admin-amount" className="text-xs">
                        Pontos
                      </Label>
                      <Input
                        id="admin-amount"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                      />
                    </div>
                    <Button size="sm" onClick={() => runAdjust("add")} disabled={busy}>
                      Aumentar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => runAdjust("subtract")}
                      disabled={busy}
                    >
                      Diminuir
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => runAdjust("set")}
                      disabled={busy}
                    >
                      Definir
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {ELOS.map((elo) => (
                      <Button
                        key={elo}
                        size="sm"
                        variant={player.elo === elo ? "default" : "secondary"}
                        onClick={() => runAdjust("elo", elo)}
                        disabled={busy}
                      >
                        {elo}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <p className="title-caps text-xs text-muted-foreground">Histórico</p>
                    {matches.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma partida registrada.</p>
                    ) : (
                      <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                        {matches.map((match) => (
                          <li
                            key={match.id}
                            className="flex justify-between rounded border border-border/60 px-2 py-1"
                          >
                            <span>
                              {match.result === "win" ? "Vitória" : "Derrota"} · {match.kills}/
                              {match.deaths}
                            </span>
                            <span
                              className={
                                match.points_delta >= 0 ? "text-primary" : "text-destructive"
                              }
                            >
                              {match.points_delta >= 0 ? "+" : ""}
                              {match.points_delta}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
