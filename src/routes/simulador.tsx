import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthGate } from "@/components/AuthGate";
import { submitMatchForReview } from "@/lib/matchReview.functions";

export const Route = createFileRoute("/simulador")({
  head: () => ({
    meta: [
      { title: "Simulador de Rank — Seven CS" },
      { name: "description", content: "Envie o print da partida e aguarde a análise administrativa." },
      { property: "og:title", content: "Simulador de Rank — Seven CS" },
      { property: "og:description", content: "Registre partidas e aguarde a validação administrativa." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: () => <AuthGate><SimulatorPage /></AuthGate>,
});

function SimulatorPage() {
  const submit = useServerFn(submitMatchForReview);
  const [preview, setPreview] = useState<string | null>(null);
  const [kills, setKills] = useState("");
  const [deaths, setDeaths] = useState("");
  const [result, setResult] = useState<"win" | "loss" | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(false);

  const calculatedKd = useMemo(() => {
    const k = Number(kills);
    const d = Number(deaths);
    if (!Number.isFinite(k) || !Number.isFinite(d) || k < 0 || d < 0 || kills === "" || deaths === "") return null;
    return d === 0 ? k : k / d;
  }, [kills, deaths]);

  async function onFile(file: File) {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
      reader.readAsDataURL(file);
    });
    setPreview(base64);
    setPending(false);
  }

  async function confirm() {
    if (!preview) { toast.error("Envie o print da partida."); return; }
    if (!result) { toast.error("Informe se foi Vitória ou Derrota."); return; }
    const k = Number(kills);
    const d = Number(deaths);
    if (!Number.isInteger(k) || k < 0 || k > 100) { toast.error("Informe uma quantidade válida de Kills."); return; }
    if (!Number.isInteger(d) || d < 0 || d > 100) { toast.error("Informe uma quantidade válida de Mortes."); return; }
    const kd = d === 0 ? k : k / d;
    if (!Number.isFinite(kd) || kd > 20) { toast.error("O KD calculado precisa estar entre 0 e 20."); return; }

    setSaving(true);
    try {
      await submit({ data: { result, kills: k, deaths: d, kd: Number(kd.toFixed(2)), screenshot: preview } });
      setPending(true);
      toast.success("Partida enviada para análise!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar.");
    } finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <h1 className="title-caps text-2xl">Simulador de Rank</h1>
        <p className="mt-2 text-sm text-muted-foreground">Envie o print, informe suas Kills e Mortes e aguarde a análise administrativa.</p>
      </header>

      <section className="panel rounded-lg p-6">
        <Label htmlFor="print" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-2 p-8 text-center text-sm text-muted-foreground hover:border-primary/60">
          <Upload className="size-6 text-primary" />
          Clique para enviar o print da partida
        </Label>
        <input id="print" type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onFile(file); }} />
        {preview && <img src={preview} alt="Print da partida" className="mt-4 max-h-64 w-full rounded-md border border-border object-contain" />}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="kills">Kills</Label>
            <Input id="kills" type="number" min="0" max="100" step="1" placeholder="Ex.: 18" value={kills} onChange={(event) => setKills(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deaths">Mortes</Label>
            <Input id="deaths" type="number" min="0" max="100" step="1" placeholder="Ex.: 12" value={deaths} onChange={(event) => setDeaths(event.target.value)} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          O Seven CS não vai tentar descobrir automaticamente qual dos 5 jogadores do print é você. Informe manualmente suas Kills e Mortes.
        </p>
        {calculatedKd !== null && (
          <div className="mt-3 rounded-md border border-border bg-surface-2 px-4 py-3 text-sm">
            Seu KD calculado: <span className="font-semibold text-primary">{calculatedKd.toFixed(2)}</span>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant={result === "win" ? "default" : "secondary"} className="flex-1" onClick={() => setResult("win")}>Vitória</Button>
          <Button variant={result === "loss" ? "default" : "secondary"} className="flex-1" onClick={() => setResult("loss")}>Derrota</Button>
        </div>
        <Button className="mt-4 w-full" onClick={confirm} disabled={saving || pending}>{saving ? "Enviando…" : pending ? "Aguardando análise" : "Enviar para análise"}</Button>
      </section>

      {pending && (
        <section className="panel rounded-lg border border-primary/30 p-6">
          <h2 className="title-caps text-sm text-primary">Aguardando análise</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sua partida foi enviada. O administrador vai conferir seu nome da Steam, suas Kills/Mortes, o KD e o print antes de aplicar pontos, Elo e estatísticas.</p>
        </section>
      )}

      <p className="text-xs text-muted-foreground">O Seven CS é um simulador independente e não altera o ranking oficial do Counter-Strike.</p>
    </div>
  );
}
