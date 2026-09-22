import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthGate } from "@/components/AuthGate";
import { EloBadge, EloProgress } from "@/components/EloBadge";
import { analyzeScreenshot, submitMatch, type MatchOutcome } from "@/lib/match.functions";

export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador de Rank — Seven CS" },
      {
        name: "description",
        content:
          "Envie o print da sua partida de CS: a IA lê kills, deaths e K/D e calcula os pontos do seu elo Seven CS.",
      },
      { property: "og:title", content: "Simulador de Rank — Seven CS" },
      {
        property: "og:description",
        content: "Registre partidas por print e acompanhe a evolução do seu elo independente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AuthGate>
      <SimulatorPage />
    </AuthGate>
  ),
});

function SimulatorPage() {
  const queryClient = useQueryClient();
  const analyze = useServerFn(analyzeScreenshot);
  const submit = useServerFn(submitMatch);

  const [preview, setPreview] = useState<string | null>(null);
  const [kills, setKills] = useState("");
  const [deaths, setDeaths] = useState("");
  const [result, setResult] = useState<"win" | "loss" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<MatchOutcome | null>(null);

  async function onFile(file: File) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
      reader.readAsDataURL(file);
    });
    setPreview(base64);
    setOutcome(null);
    setAnalyzing(true);
    try {
      const analysis = await analyze({ data: { image: base64 } });
      if (analysis.kills !== null) setKills(String(analysis.kills));
      if (analysis.deaths !== null) setDeaths(String(analysis.deaths));
      if (analysis.result) setResult(analysis.result);
      setNote(analysis.note);
    } catch {
      setNote("Não foi possível analisar o print. Informe os números manualmente.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function confirm() {
    if (!result) {
      toast.error("Informe se foi Vitória ou Derrota.");
      return;
    }
    const k = Number(kills);
    const d = Number(deaths);
    if (!Number.isFinite(k) || !Number.isFinite(d) || k < 0 || d < 0) {
      toast.error("Informe kills e deaths válidos.");
      return;
    }
    setSaving(true);
    try {
      const data = await submit({
        data: { result, kills: Math.round(k), deaths: Math.round(d) },
      });
      setOutcome(data);
      await queryClient.invalidateQueries();
      toast.success("Partida registrada!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível registrar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <h1 className="title-caps text-2xl">Simulador de Rank</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Envie o print da partida e confirme o resultado. Você pode corrigir os números antes de
          confirmar.
        </p>
      </header>

      <section className="panel rounded-lg p-6">
        <Label
          htmlFor="print"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-2 p-8 text-center text-sm text-muted-foreground hover:border-primary/60"
        >
          <Upload className="size-6 text-primary" />
          {analyzing ? "Analisando o print…" : "Clique para enviar o print da partida"}
        </Label>
        <input
          id="print"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onFile(file);
          }}
        />

        {preview && (
          <img
            src={preview}
            alt="Print da partida"
            className="mt-4 max-h-64 w-full rounded-md border border-border object-contain"
          />
        )}
        {note && <p className="mt-3 text-xs text-muted-foreground">{note}</p>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="kills">Kills</Label>
            <Input
              id="kills"
              inputMode="numeric"
              value={kills}
              onChange={(event) => setKills(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deaths">Deaths</Label>
            <Input
              id="deaths"
              inputMode="numeric"
              value={deaths}
              onChange={(event) => setDeaths(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            variant={result === "win" ? "default" : "secondary"}
            className="flex-1"
            onClick={() => setResult("win")}
          >
            Vitória
          </Button>
          <Button
            variant={result === "loss" ? "default" : "secondary"}
            className="flex-1"
            onClick={() => setResult("loss")}
          >
            Derrota
          </Button>
        </div>

        <Button className="mt-4 w-full" onClick={confirm} disabled={saving}>
          {saving ? "Salvando…" : "Confirmar partida"}
        </Button>
      </section>

      {outcome && (
        <section className="panel rounded-lg p-6">
          <h2 className="title-caps text-sm text-muted-foreground">Resultado da partida</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label="Resultado" value={outcome.result === "win" ? "Vitória" : "Derrota"} />
            <Info label="K/D identificado" value={`${outcome.kills}/${outcome.deaths} (${outcome.kd})`} />
            <Info
              label="Pontos"
              value={`${outcome.delta >= 0 ? "+" : ""}${outcome.delta}${
                outcome.multiplier > 1 ? ` (multiplicador ${outcome.multiplier}x)` : ""
              }`}
            />
            <Info label="Elo anterior" value={`${outcome.eloBefore} · ${outcome.pointsBefore} pts`} />
          </div>
          <div className="mt-6 flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Elo atual
            </span>
            <EloBadge elo={outcome.eloAfter} />
          </div>
          <EloProgress elo={outcome.eloAfter} points={outcome.pointsAfter} className="mt-4" />
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        O Seven CS é um simulador independente e não altera o ranking oficial do Counter-Strike.
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 p-3">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}
