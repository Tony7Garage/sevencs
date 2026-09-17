import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">Carregando…</div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h2 className="title-caps text-xl">Área de jogadores</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie sua conta ou entre para acessar esta parte do Seven CS.
        </p>
        <Button asChild className="mt-6">
          <Link to="/auth">Entrar ou cadastrar</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
