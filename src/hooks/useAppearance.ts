import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProfile } from "./useProfile";
import {
  applyAppearance,
  DEFAULT_ACCENT,
  DEFAULT_THEME,
  normalizeAccent,
  normalizeTheme,
  type AccentValue,
  type ThemeValue,
} from "@/lib/appearance";

/** Aplica e salva a personalização do usuário logado. */
export function useAppearance() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const theme = normalizeTheme(profile?.theme ?? DEFAULT_THEME);
  const accent = normalizeAccent(profile?.accent ?? DEFAULT_ACCENT);

  useEffect(() => {
    applyAppearance(theme, accent);
  }, [theme, accent]);

  const save = useMutation({
    mutationFn: async (next: { theme?: ThemeValue; accent?: AccentValue }) => {
      applyAppearance(next.theme ?? theme, next.accent ?? accent);
      if (!user) return;
      const { error } = await supabase
        .from("profiles")
        .update({
          theme: next.theme ?? theme,
          accent: next.accent ?? accent,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });

  return { theme, accent, save };
}

/** Mantém o documento sincronizado com a preferência salva da conta. */
export function useAppearanceSync() {
  const { data: profile } = useProfile();
  const theme = profile?.theme;
  const accent = profile?.accent;

  useEffect(() => {
    applyAppearance(theme ?? DEFAULT_THEME, accent ?? DEFAULT_ACCENT);
  }, [theme, accent]);
}
