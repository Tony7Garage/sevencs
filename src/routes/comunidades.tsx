import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthGate } from "@/components/AuthGate";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/comunidades")({
  head: () => ({ meta: [{ title: "Comunidades — Seven CS" }] }),
  component: () => <AuthGate><CommunitiesPage /></AuthGate>,
});

function CommunitiesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [access, setAccess] = useState("public");
  const [minRank, setMinRank] = useState("");
  const { data: communities = [] } = useQuery({
    queryKey: ["communities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("communities").select("id, community_id, name, description, image_url, access_type, min_rank, owner_id").order("created_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  async function createCommunity() {
    if (!name.trim()) { toast.error("Informe o nome da comunidade."); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase.from("communities").insert({ name: name.trim(), description: description.trim() || null, image_url: image.trim() || null, access_type: access, min_rank: access === "rank" ? minRank || null : null, owner_id: user!.id }).select("id").single();
      if (error) throw error;
      await supabase.from("community_members").insert({ community_id: data.id, user_id: user!.id, status: "active" });
      await supabase.from("community_channels").insert([{ community_id: data.id, name: "Chat Geral", type: "text" }]);
      setName(""); setDescription(""); setImage(""); setAccess("public"); setMinRank("");
      toast.success("Comunidade criada!"); await qc.invalidateQueries({ queryKey: ["communities"] });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível criar a comunidade."); }
    finally { setCreating(false); }
  }

  async function join(id: string, type: string) {
    if (type === "invite") { toast.info("Essa comunidade exige convite/link."); return; }
    const status = type === "approval" || type === "rank" ? "pending" : "active";
    const { error } = await supabase.from("community_members").insert({ community_id: id, user_id: user!.id, status });
    if (error) toast.error(error.message); else toast.success(status === "pending" ? "Solicitação enviada!" : "Você entrou na comunidade!");
  }

  return <div className="mx-auto max-w-5xl space-y-6 px-4 py-10"><header><h1 className="title-caps text-2xl">Comunidades</h1><p className="mt-2 text-sm text-muted-foreground">Crie sua comunidade e escolha como outras pessoas podem entrar.</p></header>
    <section className="panel space-y-3 rounded-lg p-6"><h2 className="title-caps text-sm text-muted-foreground">Criar comunidade</h2><Label htmlFor="community-name">Nome</Label><Input id="community-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Seven Players" /><Label htmlFor="community-description">Descrição</Label><Input id="community-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Sobre a comunidade" /><Label htmlFor="community-image">Imagem (URL)</Label><Input id="community-image" value={image} onChange={e => setImage(e.target.value)} placeholder="https://..." /><Label htmlFor="community-access">Acesso</Label><select id="community-access" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" value={access} onChange={e => setAccess(e.target.value)}><option value="public">Pública / aberta</option><option value="invite">Somente convite/link</option><option value="approval">Entrada mediante aprovação</option><option value="rank">Exige rank</option></select>{access === "rank" && <Input value={minRank} onChange={e => setMinRank(e.target.value)} placeholder="Rank mínimo" />}<Button onClick={createCommunity} disabled={creating}>{creating ? "Criando…" : "Criar comunidade"}</Button></section>
    <div className="grid gap-4 md:grid-cols-2">{communities.map(c => <section key={c.id} className="panel rounded-lg p-5">{c.image_url && <img src={c.image_url} alt="" className="mb-4 h-32 w-full rounded-md object-cover" />}<div className="flex items-start gap-3"><div className="min-w-0 flex-1"><h2 className="title-caps text-lg">{c.name}</h2><p className="font-mono text-xs text-muted-foreground">ID {c.community_id}</p><p className="mt-2 text-sm text-muted-foreground">{c.description || "Sem descrição."}</p></div><Button variant="secondary" onClick={() => void join(c.id, c.access_type)}>Entrar</Button></div><p className="mt-3 text-xs text-muted-foreground">{c.access_type === "public" ? "Aberta" : c.access_type === "invite" ? "Convite/link" : c.access_type === "approval" ? "Aprovação" : `Rank mínimo: ${c.min_rank || "definido pelo dono"}`}</p></section>)}</div>
  </div>;
}
