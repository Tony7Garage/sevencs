import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou cadastrar — Seven CS" },
      {
        name: "description",
        content: "Crie sua conta no Seven CS para registrar partidas, subir de elo e montar equipe.",
      },
      { property: "og:title", content: "Entrar no Seven CS" },
      {
        property: "og:description",
        content: "Acesse sua conta Seven CS e continue evoluindo no simulador de rank.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        const { data: signedIn } = await supabase.auth.getSession();
        if (signedIn.session) {
          toast.success("Conta criada! Bem-vindo ao Seven CS.");
        } else {
          toast.success("Conta criada! Confirme o e-mail que enviamos para entrar.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível continuar.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result?.error) {
        toast.error("Não foi possível entrar com o Google. Tente novamente.");
        return;
      }
      if (result && "redirected" in result && result.redirected) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        toast.success("Conta Google conectada!");
        navigate({ to: "/dashboard" });
      }
    } catch {
      toast.error("O login com o Google foi cancelado ou falhou.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="title-caps text-2xl">
        {mode === "login" ? "Entrar" : "Criar conta"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Seu progresso, elo e histórico ficam salvos na sua conta.
      </p>

      <form onSubmit={submit} className="panel mt-6 space-y-4 rounded-lg p-6">
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="name">Nome de jogador</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nick"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Cadastrar"}
        </Button>
        <Button type="button" variant="secondary" className="w-full" disabled={busy} onClick={google}>
          Continuar com Google
        </Button>
      </form>

      <button
        type="button"
        className="mt-4 w-full text-sm text-muted-foreground hover:text-primary"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? "Não tenho conta — cadastrar" : "Já tenho conta — entrar"}
      </button>
    </div>
  );
}
