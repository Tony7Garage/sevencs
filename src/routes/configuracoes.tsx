import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AuthGate } from "@/components/AuthGate";
import { useAppearance } from "@/hooks/useAppearance";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { ACCENTS, THEMES, type AccentValue, type ThemeValue } from "@/lib/appearance";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações e personalização — Seven CS" },
      { name: "description", content: "Escolha o tema, a cor secundária e sua Gamer Tag da Steam no Seven CS." },
      { property: "og:title", content: "Personalize seu Seven CS" },
      { property: "og:description", content: "Tema, cor secundária e identidade da Steam salvos na sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AuthGate><SettingsPage /></AuthGate>,
});

function SettingsPage() {
  const { theme, accent, save } = useAppearance();
  const { user } = useAuth();
  const { data: profile, refetch } = useProfile();
  const [steamName, setSteamName] = useState("");
  const [savingSteam, setSavingSteam] = useState(false);

  useEffect(() => {
    setSteamName(String((profile as any)?.steam_name ?? ""));
  }, [profile]);

  function update(next: { theme?: ThemeValue; accent?: AccentValue }) {
    save.mutate(next, {
      onSuccess: () => toast.success("Personalização salva na sua conta."),
      onError: () => toast.error("Não foi possível salvar. Tente novamente."),
    });
  }

  async function saveSteamName() {
    if (!user) return;
    setSavingSteam(true);
    try {
      const { error } = await (supabase.from("profiles") as any)
        .update({ steam_name: steamName.trim() || null })
        .eq("id", user.id);
      if (error) throw error;
      await refetch();
      toast.success("Gamer Tag da Steam salva.");
    } catch {
      toast.error("Não foi possível salvar sua Gamer Tag da Steam.");
    } finally {
      setSavingSteam(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <h1 className="title-caps text-2xl">Configurações</h1>
        <p className="mt-2 text-sm text-muted-foreground">Personalize sua conta e mantenha sua identidade da Steam vinculada ao Seven CS.</p>
      </header>

      <section className="panel rounded-lg p-6">
        <h2 className="title-caps text-sm text-muted-foreground">Identidade da Steam</h2>
        <p className="mt-2 text-sm text-muted-foreground">Esse nome é usado para você se identificar no print da partida. Ele é diferente do seu nome de usuário do Seven CS.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1"><Label htmlFor="steam-name">Gamer Tag / Nome da Steam</Label><Input id="steam-name" className="mt-1" placeholder="Ex.: Sena" maxLength={80} value={steamName} onChange={(event) => setSteamName(event.target.value)} /></div>
          <Button className="sm:mt-6" onClick={() => void saveSteamName()} disabled={savingSteam}>{savingSteam ? "Salvando…" : "Salvar Steam"}</Button>
        </div>
      </section>

      <section className="panel rounded-lg p-6">
        <h2 className="title-caps text-sm text-muted-foreground">Tema</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {THEMES.map((item) => (
            <button key={item.value} type="button" onClick={() => update({ theme: item.value })} className={`rounded-lg border p-4 text-left transition-colors ${theme === item.value ? "border-primary bg-surface-2" : "border-border hover:bg-surface-2"}`}>
              <span className="block text-sm font-semibold">{item.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{item.value === "preto" ? "Escuro total (padrão)" : item.value === "cinza" ? "Escuro suave" : "Claro"}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel rounded-lg p-6">
        <h2 className="title-caps text-sm text-muted-foreground">Cor secundária</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ACCENTS.map((item) => (
            <button key={item.value} type="button" onClick={() => update({ accent: item.value })} className={`flex items-center gap-3 rounded-lg border p-4 transition-colors ${accent === item.value ? "border-primary bg-surface-2" : "border-border hover:bg-surface-2"}`}>
              <span className="size-6 rounded-full border border-border" style={{ backgroundColor: item.swatch }} />
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Padrão do Seven CS: preto com roxo.</p>
      </section>
    </div>
  );
}
