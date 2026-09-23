import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { EloBadge } from "@/components/EloBadge";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

const LINKS = [
  { to: "/", label: "Início" },
  { to: "/dashboard", label: "Painel" },
  { to: "/simulador", label: "Simulador" },
  { to: "/equipes", label: "Equipes" },
  { to: "/chat", label: "Comunidade" },
  { to: "/perfil", label: "Perfil" },
  { to: "/configuracoes", label: "Configurações" },
] as const;

export function SiteHeader() {
  const { session, signOut } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="title-caps text-lg text-primary text-glow">
          Seven<span className="text-foreground">CS</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              activeProps={{ className: "bg-surface text-primary" }}
              activeOptions={{ exact: link.to === "/" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {session && profile ? (
            <>
              <div className="hidden items-center gap-2 sm:flex">
                <EloBadge elo={profile.elo} />
                <PlayerAvatar
                  name={profile.display_name}
                  url={profile.avatar_url}
                  className="size-8"
                />
              </div>
              <Button variant="secondary" size="sm" onClick={() => signOut()}>
                Sair
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate({ to: "/auth" })}>
              Entrar
            </Button>
          )}
          <Button
            variant="secondary"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label="Menu"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav className="grid gap-1 border-t border-border px-4 py-3 md:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-surface hover:text-foreground"
              activeProps={{ className: "bg-surface text-primary" }}
              activeOptions={{ exact: link.to === "/" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
