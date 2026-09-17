export const ELOS = [
  "Bronze",
  "Prata",
  "Ouro",
  "Platina",
  "Diamante",
  "Elite",
  "Global",
] as const;

export type Elo = (typeof ELOS)[number];

export const POINTS_PER_ELO = 100;

export function isElo(value: string): value is Elo {
  return (ELOS as readonly string[]).includes(value);
}

export function normalizeElo(value: string): Elo {
  return isElo(value) ? value : "Bronze";
}

/** Pontos ganhos/perdidos com base no resultado, K/D e multiplicador global. */
export function calculatePoints(input: {
  result: "win" | "loss";
  kills: number;
  deaths: number;
  multiplier?: number;
}): { delta: number; kd: number } {
  const kills = Math.max(0, Math.round(input.kills));
  const deaths = Math.max(0, Math.round(input.deaths));
  const kd = deaths === 0 ? kills : Math.round((kills / deaths) * 100) / 100;

  const bonus = Math.max(-8, Math.min(12, Math.round((kd - 1) * 8)));
  const raw = input.result === "win" ? 20 + bonus : -18 + bonus;

  const multiplier = input.multiplier && input.multiplier > 0 ? input.multiplier : 1;
  const delta = Math.round(raw * multiplier);
  return { delta, kd };
}

/** Aplica um delta de pontos respeitando a hierarquia de elos (nunca abaixo de 0). */
export function applyPoints(
  elo: string,
  points: number,
  delta: number,
): { elo: Elo; points: number } {
  let index = ELOS.indexOf(normalizeElo(elo));
  let value = Math.round(points) + Math.round(delta);

  while (value >= POINTS_PER_ELO && index < ELOS.length - 1) {
    value -= POINTS_PER_ELO;
    index += 1;
  }
  while (value < 0 && index > 0) {
    value += POINTS_PER_ELO;
    index -= 1;
  }

  if (index === ELOS.length - 1) value = Math.min(value, POINTS_PER_ELO);
  if (value < 0) value = 0;

  return { elo: ELOS[index]!, points: value };
}

export function eloProgress(points: number) {
  return Math.max(0, Math.min(100, Math.round((points / POINTS_PER_ELO) * 100)));
}
