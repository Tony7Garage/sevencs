import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { applyPoints, calculatePoints, normalizeElo } from "./elo";

const ADMIN_PLAYER_ID = "535226";

async function getAdminClient(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile, error } = await supabaseAdmin.from("profiles").select("id, player_id").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) throw new Error("Perfil administrativo não encontrado.");
  if (profile.player_id === ADMIN_PLAYER_ID) return supabaseAdmin;

  const { data: adminRow, error: adminError } = await (supabaseAdmin as any)
    .from("admin_access")
    .select("player_id")
    .eq("player_id", profile.player_id)
    .maybeSingle();
  if (adminError) throw new Error(adminError.message);
  if (!adminRow) throw new Error("Seu ID não tem acesso ao painel administrativo.");
  return supabaseAdmin;
}

export const adminV3Unlock = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await getAdminClient(context.userId);
  return { ok: true as const };
});

export const adminV3ListAdminAccess = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const supabaseAdmin = await getAdminClient(context.userId);
  const { data, error } = await (supabaseAdmin as any).from("admin_access").select("player_id, created_at").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [{ player_id: ADMIN_PLAYER_ID, created_at: null }];
});

export const adminV3SetAdminAccess = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => z.object({ playerId: z.string().regex(/^\d{4,}$/), enabled: z.boolean() }).parse(data)).handler(async ({ data, context }) => {
  const supabaseAdmin = await getAdminClient(context.userId);
  if (data.playerId === ADMIN_PLAYER_ID && !data.enabled) throw new Error("O administrador principal não pode ser removido.");
  const { data: target } = await supabaseAdmin.from("profiles").select("player_id").eq("player_id", data.playerId).maybeSingle();
  if (!target) throw new Error("Usuário com esse ID não encontrado.");
  if (data.enabled) {
    const { error } = await (supabaseAdmin as any).from("admin_access").upsert({ player_id: data.playerId, created_by: context.userId }, { onConflict: "player_id" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await (supabaseAdmin as any).from("admin_access").delete().eq("player_id", data.playerId);
    if (error) throw new Error(error.message);
  }
  return { ok: true as const };
});

export const adminV3ListUsers = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const supabaseAdmin = await getAdminClient(context.userId);
  const { data: profiles, error } = await (supabaseAdmin as any)
    .from("profiles")
    .select("id, player_id, display_name, avatar_url, elo, points, wins, losses, total_kills, total_deaths, created_at, last_seen")
    .order("last_seen", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  const now = Date.now();
  return (profiles ?? []).map((profile: any) => ({
    ...profile,
    online: !!profile.last_seen && now - new Date(profile.last_seen).getTime() <= 120000,
    kd: profile.total_deaths > 0 ? Number((profile.total_kills / profile.total_deaths).toFixed(2)) : profile.total_kills,
  }));
});

export const adminV3UpdatePlayer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => z.object({
  playerId: z.string(),
  newPlayerId: z.string().regex(/^\d{4,}$/).optional(),
  displayName: z.string().min(1).max(80).optional(),
  avatarUrl: z.string().max(1000).optional(),
  elo: z.string().optional(),
  points: z.number().int().min(0).optional(),
  wins: z.number().int().min(0).optional(),
  losses: z.number().int().min(0).optional(),
  totalKills: z.number().int().min(0).optional(),
  totalDeaths: z.number().int().min(0).optional(),
}).parse(data)).handler(async ({ data, context }) => {
  const supabaseAdmin = await getAdminClient(context.userId);
  const { data: profile } = await (supabaseAdmin as any).from("profiles").select("id").eq("player_id", data.playerId).maybeSingle();
  if (!profile) throw new Error("Jogador não encontrado.");
  if (data.newPlayerId && data.newPlayerId !== data.playerId) {
    const { data: existing } = await (supabaseAdmin as any).from("profiles").select("id").eq("player_id", data.newPlayerId).maybeSingle();
    if (existing) throw new Error("Esse novo ID já está sendo usado.");
  }
  const update: Record<string, unknown> = {};
  if (data.newPlayerId) update.player_id = data.newPlayerId;
  if (data.displayName !== undefined) update.display_name = data.displayName;
  if (data.avatarUrl !== undefined) update.avatar_url = data.avatarUrl;
  if (data.elo !== undefined) update.elo = data.elo;
  if (data.points !== undefined) update.points = data.points;
  if (data.wins !== undefined) update.wins = data.wins;
  if (data.losses !== undefined) update.losses = data.losses;
  if (data.totalKills !== undefined) update.total_kills = data.totalKills;
  if (data.totalDeaths !== undefined) update.total_deaths = data.totalDeaths;
  if (!Object.keys(update).length) throw new Error("Nenhuma alteração informada.");
  const { error } = await (supabaseAdmin as any).from("profiles").update(update).eq("id", profile.id);
  if (error) throw new Error(error.message);
  return { ok: true as const };
});

export const adminV3PendingMatches = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const supabaseAdmin = await getAdminClient(context.userId);
  const { data: matches, error } = await supabaseAdmin.from("matches").select("id, user_id, result, kills, deaths, kd, screenshot_url, submitted_result, submitted_kills, submitted_deaths, status, created_at, profiles(display_name, player_id)").eq("status", "pending").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return matches ?? [];
});

export const adminV3ReviewMatch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => z.object({ matchId: z.string().uuid(), decision: z.enum(["approved", "invalid"]), result: z.enum(["win", "loss"]).optional(), kills: z.number().int().min(0).max(200).optional(), deaths: z.number().int().min(0).max(200).optional(), note: z.string().max(500).optional() }).parse(data)).handler(async ({ data, context }) => {
  const supabaseAdmin = await getAdminClient(context.userId);
  const { data: match, error: matchError } = await supabaseAdmin.from("matches").select("*").eq("id", data.matchId).single();
  if (matchError || !match) throw new Error("Partida não encontrada.");
  if (match.status !== "pending") throw new Error("Essa partida já foi analisada.");
  const result = data.result ?? match.submitted_result ?? match.result;
  const kills = data.kills ?? match.submitted_kills ?? match.kills;
  const deaths = data.deaths ?? match.submitted_deaths ?? match.deaths;
  if (data.decision === "invalid") {
    const { error } = await supabaseAdmin.from("matches").update({ status: "invalid", reviewed_by: context.userId, reviewed_at: new Date().toISOString(), review_note: data.note ?? "Partida invalidada pelo administrador." }).eq("id", match.id);
    if (error) throw new Error(error.message);
    return { status: "invalid" as const };
  }
  if (!result || !Number.isInteger(kills) || !Number.isInteger(deaths)) throw new Error("Dados da partida incompletos.");
  const { data: profile, error: profileError } = await supabaseAdmin.from("profiles").select("id, elo, points, wins, losses, total_kills, total_deaths").eq("id", match.user_id).single();
  if (profileError || !profile) throw new Error("Perfil do jogador não encontrado.");
  const { data: settings } = await supabaseAdmin.from("global_settings").select("multiplier_enabled, multiplier").eq("id", 1).maybeSingle();
  const multiplier = settings?.multiplier_enabled ? Number(settings.multiplier) || 1 : 1;
  const calc = calculatePoints({ result, kills, deaths, multiplier });
  const next = applyPoints(normalizeElo(profile.elo), profile.points, calc.delta);
  const { error: updateProfileError } = await supabaseAdmin.from("profiles").update({ elo: next.elo, points: next.points, wins: profile.wins + (result === "win" ? 1 : 0), losses: profile.losses + (result === "loss" ? 1 : 0), total_kills: profile.total_kills + kills, total_deaths: profile.total_deaths + deaths }).eq("id", profile.id);
  if (updateProfileError) throw new Error(updateProfileError.message);
  const { error: updateMatchError } = await supabaseAdmin.from("matches").update({ status: "approved", result, kills, deaths, kd: calc.kd, points_delta: calc.delta, multiplier, elo_before: profile.elo, elo_after: next.elo, points_before: profile.points, points_after: next.points, verified_result: result, verified_kills: kills, verified_deaths: deaths, reviewed_by: context.userId, reviewed_at: new Date().toISOString(), review_note: data.note ?? null }).eq("id", match.id);
  if (updateMatchError) throw new Error(updateMatchError.message);
  return { status: "approved" as const, elo: next.elo, points: next.points, delta: calc.delta };
});
