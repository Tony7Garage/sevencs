import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ELOS, applyPoints, normalizeElo } from "./elo";

const ADMIN_CODE = "CS12052011";

function assertCode(code: string) {
  if (code !== ADMIN_CODE) throw new Error("Código administrativo inválido.");
}

export const adminUnlock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ code: z.string() }).parse(data))
  .handler(async ({ data }) => {
    assertCode(data.code);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin
      .from("global_settings")
      .select("multiplier_enabled, multiplier")
      .eq("id", 1)
      .maybeSingle();
    return {
      ok: true as const,
      multiplierEnabled: settings?.multiplier_enabled ?? false,
      multiplier: Number(settings?.multiplier ?? 1),
    };
  });

export const adminFindPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ code: z.string(), playerId: z.string().min(1).max(32) }).parse(data),
  )
  .handler(async ({ data }) => {
    assertCode(data.code);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("player_id", data.playerId.trim())
      .maybeSingle();
    if (!profile) throw new Error("Jogador não encontrado.");

    const { data: matches } = await supabaseAdmin
      .from("matches")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(25);

    return { profile, matches: matches ?? [] };
  });

export const adminAdjustPlayer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        code: z.string(),
        playerId: z.string().min(1),
        action: z.enum(["add", "subtract", "set", "elo"]),
        amount: z.number().int().min(-10000).max(10000).optional(),
        elo: z.enum(ELOS).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    assertCode(data.code);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, elo, points")
      .eq("player_id", data.playerId.trim())
      .maybeSingle();
    if (!profile) throw new Error("Jogador não encontrado.");

    let elo = normalizeElo(profile.elo);
    let points = profile.points;

    if (data.action === "elo") {
      elo = data.elo ?? elo;
    } else if (data.action === "set") {
      const value = Math.max(0, Math.min(100, data.amount ?? 0));
      points = value;
    } else {
      const delta = (data.action === "add" ? 1 : -1) * Math.abs(data.amount ?? 0);
      const next = applyPoints(elo, points, delta);
      elo = next.elo;
      points = next.points;
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ elo, points })
      .eq("id", profile.id);
    if (error) throw new Error(error.message);

    return { elo, points };
  });

export const adminSetMultiplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        code: z.string(),
        enabled: z.boolean(),
        multiplier: z.number().min(1).max(10),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    assertCode(data.code);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("global_settings")
      .update({
        multiplier_enabled: data.enabled,
        multiplier: data.multiplier,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { enabled: data.enabled, multiplier: data.multiplier };
  });
