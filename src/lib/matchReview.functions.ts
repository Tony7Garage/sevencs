import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  result: z.enum(["win", "loss"]),
  kd: z.number().min(0).max(20),
  screenshot: z.string().min(32).max(12_000_000),
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

    const { error } = await supabaseAdmin.from("matches").insert({
      user_id: context.userId,
      result: data.result,
      kills: 0,
      deaths: 0,
      kd: Number(data.kd.toFixed(2)),
      submitted_kd: Number(data.kd.toFixed(2)),
      points_delta: 0,
      multiplier,
      elo_before: profile.elo,
      elo_after: profile.elo,
      points_before: profile.points,
      points_after: profile.points,
      status: "pending",
      screenshot_url: data.screenshot,
      submitted_result: data.result,
      submitted_kills: null,
      submitted_deaths: null,
    });
    if (error) throw new Error(error.message);

    return { status: "pending" as const, kd: data.kd, message: "Aguardando análise do administrador." };
  });
