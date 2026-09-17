import { ELOS, eloProgress, normalizeElo } from "@/lib/elo";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  Bronze: "text-amber-600/90 border-amber-700/50 bg-amber-950/40",
  Prata: "text-zinc-200 border-zinc-500/50 bg-zinc-800/60",
  Ouro: "text-yellow-300 border-yellow-600/50 bg-yellow-950/40",
  Platina: "text-cyan-200 border-cyan-600/50 bg-cyan-950/40",
  Diamante: "text-sky-300 border-sky-500/50 bg-sky-950/40",
  Elite: "text-fuchsia-300 border-fuchsia-600/50 bg-fuchsia-950/30",
  Global: "text-primary border-primary/60 bg-primary/10",
};

export function EloBadge({ elo, className }: { elo: string; className?: string }) {
  const value = normalizeElo(elo);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-widest",
        TONES[value],
        className,
      )}
    >
      {value}
    </span>
  );
}

export function EloProgress({
  elo,
  points,
  className,
}: {
  elo: string;
  points: number;
  className?: string;
}) {
  const value = normalizeElo(elo);
  const index = ELOS.indexOf(value);
  const next = ELOS[index + 1];
  const pct = eloProgress(points);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-end justify-between text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{points}</strong> / 100 pontos
        </span>
        <span>{next ? `Próximo: ${next}` : "Elo máximo"}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%`, boxShadow: "0 0 14px oklch(0.79 0.21 145 / 0.6)" }}
        />
      </div>
    </div>
  );
}
