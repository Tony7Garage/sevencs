import { createFileRoute, Link } from "@tanstack/react-router";
import { Crosshair, Shield, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ELOS } from "@/lib/elo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seven CS — Simulador de rank da comunidade de Counter-Strike" },
      {
        name: "description",
        content:
          "Suba de Bronze a Global no Seven CS: envie o print da partida, ganhe pontos, monte equipes e converse com a comunidade.",
      },
      { property: "og:title", content: "Seven CS — Simulador de rank independente" },
      {
        property: "og:description",
        content: "Elo próprio, simulador de rank por print, equipes e chat da comunidade de CS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  {
    icon: Crosshair,
    title: "Simulador de Rank",
    text: "Envie o print da partida: a IA lê kills, deaths e K/D e calcula seus pontos.",
    to: "/simulador" as const,
  },
  {
    icon: Users,
    title: "Monte sua Equipe",
    text: "Crie sua equipe, gere um código único e chame a galera para entrar.",
    to: "/equipes" as const,
  },
  {
    icon: Shield,
    title: "Comunidade",
    text: "Chat geral com avatar, nome e elo de cada jogador em tempo real.",
    to: "/chat" as const,
  },
];

function Index() {
  return (
    <div>
      <section className="border-b border-border bg-gradient-to-b from-surface to-background">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs uppercase tracking-widest text-primary">
            <Trophy className="size-3.5" /> V0.1 BETA
          </span>
          <h1 className="title-caps mt-6 text-4xl leading-tight sm:text-6xl">
            Seven<span className="text-primary text-glow">CS</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            A plataforma da comunidade de Counter-Strike com elo próprio. Registre suas partidas,
            evolua de Bronze até Global e jogue com sua equipe.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/simulador">Simular partida</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth">Criar conta</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            O Seven CS é um simulador independente e não altera o ranking oficial do Counter-Strike.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="title-caps text-center text-sm text-muted-foreground">Elos do Seven CS</h2>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {ELOS.map((elo, index) => (
            <span
              key={elo}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-widest"
              style={index === ELOS.length - 1 ? { color: "oklch(0.79 0.21 145)" } : undefined}
            >
              {elo}
            </span>
          ))}
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <Link
              key={feature.title}
              to={feature.to}
              className="panel group rounded-lg p-6 transition-colors hover:border-primary/50"
            >
              <feature.icon className="size-6 text-primary" />
              <h3 className="mt-4 font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.text}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
