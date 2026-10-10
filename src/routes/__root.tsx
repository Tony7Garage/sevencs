import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/SiteHeader";
import { AdminPanelV3 } from "@/components/AdminPanelV3";
import { Toaster } from "@/components/ui/sonner";
import { useAppearanceSync } from "@/hooks/useAppearance";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() { return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-7xl font-bold text-primary">404</h1><h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2><p className="mt-2 text-sm text-muted-foreground">Esta página não existe ou foi movida.</p><div className="mt-6"><Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Voltar ao início</Link></div></div></div>; }
function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) { console.error(error); const router = useRouter(); useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]); return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-xl font-semibold tracking-tight text-foreground">Esta página não carregou</h1><p className="mt-2 text-sm text-muted-foreground">Algo deu errado. Tente novamente ou volte ao início.</p><div className="mt-6 flex flex-wrap justify-center gap-2"><button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Tentar novamente</button><a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground">Início</a></div></div></div>; }

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({ meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, { title: "Seven CS — Plataforma da comunidade de Counter-Strike" }, { name: "description", content: "Seven CS: elo próprio, simulador de rank, equipes, comunidades, mensagens e rankings." }, { property: "og:title", content: "Seven CS" }, { property: "og:description", content: "Comunidade, rankings, equipes e simulador de rank independente de Counter-Strike." }, { property: "og:type", content: "website" }], links: [{ rel: "stylesheet", href: appCss }, { rel: "preconnect", href: "https://fonts.googleapis.com" }, { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Barlow:wght@400;500;600&display=swap" }, { rel: "icon", href: "/favicon.ico", type: "image/x-icon" }] }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function AppearanceSync() { useAppearanceSync(); return null; }
function ActivityHeartbeat() {
  useEffect(() => {
    let active = true;
    const updatePresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      await (supabase.from("profiles") as any).update({ last_seen: new Date().toISOString() }).eq("id", user.id);
    };
    void updatePresence();
    const interval = window.setInterval(() => void updatePresence(), 30000);
    const onVisibility = () => { if (document.visibilityState === "visible") void updatePresence(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);
  return null;
}
function RootShell({ children }: { children: ReactNode }) { return <html lang="pt-BR" className="dark"><head><HeadContent /></head><body>{children}<Scripts /></body></html>; }
function RootComponent() { const { queryClient } = Route.useRouteContext(); return <QueryClientProvider client={queryClient}><div className="flex min-h-screen flex-col"><AppearanceSync /><ActivityHeartbeat /><SiteHeader /><main className="flex-1"><Outlet /></main><footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">Seven CS V3 BETA · Simulador independente. Não altera o ranking oficial do Counter-Strike.</footer><AdminPanelV3 /><Toaster /></div></QueryClientProvider>; }
