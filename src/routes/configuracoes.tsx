import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthGate } from "@/components/AuthGate";
import { useAppearance } from "@/hooks/useAppearance";
import { ACCENTS, THEMES, type AccentValue, type ThemeValue } from "@/lib/appearance";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações e personalização — Seven CS" },
      {
        name: "description",
        content:
          "Escolha o tema (preto, cinza ou branco) e a cor secundária da sua conta Seven CS. A escolha fica salva só para você.",
      },
      { property: "og:title", content: "Personalize seu Seven CS" },
      {
        property: "og:description",
        content: "Tema e cor secundária salvos na sua conta, sem afetar os outros jogadores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AuthGate>
      <SettingsPage />
    </AuthGate>
  ),
});

function SettingsPage() {
  const { theme, accent, save } = useAppearance();

  function update(next: { theme?: ThemeValue; accent?: AccentValue }) {
    save.mutate(next, {
      onSuccess: () => toast.success("Personalização salva na sua conta."),
      onError: () => toast.error("Não foi possível salvar. Tente novamente."),
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <h1 className="title-caps text-2xl">Configurações</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A personalização vale apenas para a sua conta e continua salva quando você sair e entrar
          novamente.
        </p>
      </header>

      <section className="panel rounded-lg p-6">
        <h2 className="title-caps text-sm text-muted-foreground">Tema</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {THEMES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => update({ theme: item.value })}
              className={`rounded-lg border p-4 text-left transition-colors ${
                theme === item.value
                  ? "border-primary bg-surface-2"
                  : "border-border hover:bg-surface-2"
              }`}
            >
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {item.value === "preto"
                  ? "Escuro total (padrão)"
                  : item.value === "cinza"
                    ? "Escuro suave"
                    : "Claro"}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel rounded-lg p-6">
        <h2 className="title-caps text-sm text-muted-foreground">Cor secundária</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ACCENTS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => update({ accent: item.value })}
              className={`flex items-center gap-3 rounded-lg border p-4 transition-colors ${
                accent === item.value
                  ? "border-primary bg-surface-2"
                  : "border-border hover:bg-surface-2"
              }`}
            >
              <span
                className="size-6 rounded-full border border-border"
                style={{ backgroundColor: item.swatch }}
              />
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Padrão do Seven CS: preto com roxo.
        </p>
      </section>
    </div>
  );
}
