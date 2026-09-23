/**
 * Personalização visual por usuário.
 * Apenas tokens de tema — nenhuma regra de negócio (elo, simulador, equipes,
 * comunidade, admin) depende deste módulo.
 */

export const THEMES = [
  { value: "preto", label: "Preto" },
  { value: "cinza", label: "Cinza" },
  { value: "branco", label: "Branco" },
] as const;

export const ACCENTS = [
  { value: "roxo", label: "Roxo", swatch: "oklch(0.62 0.23 300)" },
  { value: "rosa", label: "Rosa", swatch: "oklch(0.68 0.22 350)" },
  { value: "verde", label: "Verde", swatch: "oklch(0.79 0.21 145)" },
  { value: "vermelho", label: "Vermelho", swatch: "oklch(0.62 0.23 25)" },
  { value: "azul", label: "Azul", swatch: "oklch(0.65 0.19 255)" },
  { value: "laranja", label: "Laranja", swatch: "oklch(0.72 0.19 55)" },
] as const;

export type ThemeValue = (typeof THEMES)[number]["value"];
export type AccentValue = (typeof ACCENTS)[number]["value"];

export const DEFAULT_THEME: ThemeValue = "preto";
export const DEFAULT_ACCENT: AccentValue = "roxo";

export function normalizeTheme(value: unknown): ThemeValue {
  return THEMES.some((theme) => theme.value === value)
    ? (value as ThemeValue)
    : DEFAULT_THEME;
}

export function normalizeAccent(value: unknown): AccentValue {
  return ACCENTS.some((accent) => accent.value === value)
    ? (value as AccentValue)
    : DEFAULT_ACCENT;
}

/** Aplica a preferência no documento (afeta somente esta sessão/navegador). */
export function applyAppearance(theme: unknown, accent: unknown) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const nextTheme = normalizeTheme(theme);
  root.dataset.theme = nextTheme;
  root.dataset.accent = normalizeAccent(accent);
  root.classList.toggle("dark", nextTheme !== "branco");
  root.style.colorScheme = nextTheme === "branco" ? "light" : "dark";
}
