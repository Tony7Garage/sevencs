import { useState } from "react";
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
      { name: "description", content: "Envie o print da partida e aguarde a análise do Seven CS." },
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
  const [kd, setKd] = useState("");
  const [result, setResult] = useState<"win" | "loss" | null>(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState(false);

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
    const value = Number(kd.replace(",", "."));
    if (!Number.isFinite(value) || value < 0 || value > 20) {
      toast.error("Informe um KD válido, por exemplo 1.00.");
      return;
    }
    setSaving(true);
    try {
      await submit({ data: { result, kd: Number(value.toFixed(2)), screenshot: preview } });
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
        <p className="mt-2 text-sm text-muted-foreground">Envie o print, informe o seu KD e aguarde a análise administrativa.</p>
      </header>

      <section className="panel rounded-lg p-6">
        <Label htmlFor="print" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-2 p-8 text-center text-sm text-muted-foreground hover:border-primary/60">
          <Upload className="size-6 text-primary" />
          Clique para enviar o print da partida
        </Label>
        <input id="print" type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onFile(file); }} />
        {preview && <img src={preview} alt="Print da partida" className="mt-4 max-h-64 w-full rounded-md border border-border object-contain" />}

        <div className="mt-6 space-y-2">
          <Label htmlFor="kd">Seu KD na partida</Label>
          <Input id="kd" inputMode="decimal" placeholder="Ex.: 1.00" value={kd} onChange={(event) => setKd(event.target.value)} />
          <p className="text-xs text-muted-foreground">O Seven CS não vai tentar descobrir automaticamente qual dos 5 jogadores do print é você. Informe somente o seu KD.</p>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant={result === "win" ? "default" : "secondary"} className="flex-1" onClick={() => setResult("win")}>Vitória</Button>
          <Button variant={result === "loss" ? "default" : "secondary"} className="flex-1" onClick={() => setResult("loss")}>Derrota</Button>
        </div>
        <Button className="mt-4 w-full" onClick={confirm} disabled={saving || pending}>{saving ? "Enviando…" : pending ? "Aguardando análise" : "Enviar para análise"}</Button>
      </section>

      {pending && (
        <section className="panel rounded-lg border border-primary/30 p-6">
          <h2 className="title-caps text-sm text-primary">Aguardando análise</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sua partida foi enviada. O administrador vai conferir seu nome da Steam, o KD informado e o print antes de aplicar pontos, Elo e estatísticas.</p>
        </section>
      )}

      <p className="text-xs text-muted-foreground">O Seven CS é um simulador independente e não altera o ranking oficial do Counter-Strike.</p>
    </div>
  );
}
