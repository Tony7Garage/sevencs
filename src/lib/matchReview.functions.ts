import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calculatePoints } from "./elo";

const schema = z.object({
  result: z.enum(["win", "loss"]),
  kills: z.number().int().min(0).max(200),
  deaths: z.number().int().min(0).max(200),
  screenshot: z.string().max(12_000_000).optional(),
});

export const submitMatchForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, elo, points")
      .eq("id", context.userId)
      .single();
    if (profileError || !profile) throw new Error("Perfil não encontrado.");

    const { data: settings } = await supabaseAdmin
      .from("global_settings")
      .select("multiplier_enabled, multiplier")
      .eq("id", 1)
      .maybeSingle();
    const multiplier = settings?.multiplier_enabled ? Number(settings.multiplier) || 1 : 1;
    const { kd } = calculatePoints({ result: data.result, kills: data.kills, deaths: data.deaths, multiplier });

    const { error } = await supabaseAdmin.from("matches").insert({
      user_id: context.userId,
      result: data.result,
      kills: data.kills,
      deaths: data.deaths,
      kd,
      points_delta: 0,
      multiplier,
      elo_before: profile.elo,
      elo_after: profile.elo,
      points_before: profile.points,
      points_after: profile.points,
      status: "pending",
      screenshot_url: data.screenshot ?? null,
      submitted_result: data.result,
      submitted_kills: data.kills,
      submitted_deaths: data.deaths,
    });
    if (error) throw new Error(error.message);

    return { status: "pending" as const, kd, message: "Aguardando análise do administrador." };
  });
