import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { applyPoints, calculatePoints, normalizeElo } from "./elo";

const analyzeSchema = z.object({
  image: z.string().min(32).max(12_000_000),
});

export type ScreenshotAnalysis = {
  kills: number | null;
  deaths: number | null;
  result: "win" | "loss" | null;
  confident: boolean;
  note: string;
};

/** Usa IA de visão para tentar ler kills/deaths/resultado do print da partida. */
export const analyzeScreenshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => analyzeSchema.parse(data))
  .handler(async ({ data }): Promise<ScreenshotAnalysis> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return {
        kills: null,
        deaths: null,
        result: null,
        confident: false,
        note: "Análise automática indisponível. Informe os números manualmente.",
      };
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "system",
            content:
              "Você analisa prints de scoreboard de Counter-Strike. Responda SOMENTE com JSON: " +
              '{"kills": number|null, "deaths": number|null, "result": "win"|"loss"|null, "confident": boolean}. ' +
              "Use null quando não tiver certeza do valor.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Leia as kills, deaths e o resultado da partida deste print.",
              },
              { type: "image_url", image_url: { url: data.image } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      return {
        kills: null,
        deaths: null,
        result: null,
        confident: false,
        note:
          response.status === 429
            ? "Limite de análises atingido. Informe os números manualmente."
            : "Não foi possível analisar o print. Informe os números manualmente.",
      };
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);

    let parsed: Partial<ScreenshotAnalysis> = {};
    if (match) {
      try {
        parsed = JSON.parse(match[0]) as Partial<ScreenshotAnalysis>;
      } catch {
        parsed = {};
      }
    }

    const kills = typeof parsed.kills === "number" ? Math.max(0, Math.round(parsed.kills)) : null;
    const deaths = typeof parsed.deaths === "number" ? Math.max(0, Math.round(parsed.deaths)) : null;
    const result = parsed.result === "win" || parsed.result === "loss" ? parsed.result : null;
    const confident = kills !== null && deaths !== null && parsed.confident !== false;

    return {
      kills,
      deaths,
      result,
      confident,
      note: confident
        ? "Dados identificados no print. Confira antes de confirmar."
        : "Não conseguimos ler tudo com certeza. Ajuste os números manualmente.",
    };
  });

const submitSchema = z.object({
  result: z.enum(["win", "loss"]),
  kills: z.number().int().min(0).max(200),
  deaths: z.number().int().min(0).max(200),
});

export type MatchOutcome = {
  result: "win" | "loss";
  kills: number;
  deaths: number;
  kd: number;
  delta: number;
  multiplier: number;
  eloBefore: string;
  eloAfter: string;
  pointsBefore: number;
  pointsAfter: number;
};

/** Registra a partida, aplica o multiplicador global e atualiza elo/pontos. */
export const submitMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data, context }): Promise<MatchOutcome> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, elo, points, wins, losses, total_kills, total_deaths")
      .eq("id", userId)
      .single();
    if (profileError || !profile) throw new Error("Perfil não encontrado.");

    const { data: settings } = await supabaseAdmin
      .from("global_settings")
      .select("multiplier_enabled, multiplier")
      .eq("id", 1)
      .maybeSingle();

    const multiplier = settings?.multiplier_enabled ? Number(settings.multiplier) || 1 : 1;

    const { delta, kd } = calculatePoints({
      result: data.result,
      kills: data.kills,
      deaths: data.deaths,
      multiplier,
    });

    const eloBefore = normalizeElo(profile.elo);
    const pointsBefore = profile.points;
    const next = applyPoints(eloBefore, pointsBefore, delta);

    const { error: matchError } = await supabaseAdmin.from("matches").insert({
      user_id: userId,
      result: data.result,
      kills: data.kills,
      deaths: data.deaths,
      kd,
      points_delta: delta,
      multiplier,
      elo_before: eloBefore,
      elo_after: next.elo,
      points_before: pointsBefore,
      points_after: next.points,
    });
    if (matchError) throw new Error(matchError.message);

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        elo: next.elo,
        points: next.points,
        wins: profile.wins + (data.result === "win" ? 1 : 0),
        losses: profile.losses + (data.result === "loss" ? 1 : 0),
        total_kills: profile.total_kills + data.kills,
        total_deaths: profile.total_deaths + data.deaths,
      })
      .eq("id", userId);
    if (updateError) throw new Error(updateError.message);

    return {
      result: data.result,
      kills: data.kills,
      deaths: data.deaths,
      kd,
      delta,
      multiplier,
      eloBefore,
      eloAfter: next.elo,
      pointsBefore,
      pointsAfter: next.points,
    };
  });
