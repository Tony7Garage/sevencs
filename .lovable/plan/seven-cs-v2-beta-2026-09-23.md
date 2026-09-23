# Seven CS V2 Beta

## Objetivo
Atualizar o projeto existente sem alterar o elo, o simulador, equipes, comunidade ou painel administrativo.

## Implementação

1. **Corrigir autenticação Google**
   - Trocar o login Google direto pela integração oficial gerenciada do Lovable Cloud.
   - Habilitar e validar o provedor Google e usar retorno público seguro na própria origem.
   - Tratar cancelamento, falha e retorno de autenticação com mensagens em português.
   - Manter o gatilho existente que cria perfil, papel e ID único apenas no primeiro acesso.
   - Após sessão confirmada, redirecionar para `/dashboard`.
   - Ajustar cadastro por e-mail para respeitar confirmação de e-mail e não mostrar login falso.

2. **Adicionar Dashboard sem remover o Perfil**
   - Criar `/dashboard` como visão principal da conta, reutilizando dados reais do perfil e histórico.
   - Manter `/perfil` disponível para compatibilidade com os fluxos atuais.
   - Atualizar os acessos pós-login e o cabeçalho para apontarem ao Dashboard.

3. **Persistir personalização por usuário**
   - Adicionar ao perfil os campos validados de tema (`branco`, `cinza`, `preto`) e cor secundária (`rosa`, `roxo`, `verde`, `vermelho`, `azul`, `laranja`).
   - Definir `preto + roxo` como padrão para contas novas e como fallback para contas existentes.
   - Preservar as políticas atuais: cada usuário altera somente o próprio perfil.

4. **Criar Configurações > Personalização**
   - Adicionar página de Configurações com controles visuais para tema e cor secundária.
   - Mostrar a mudança imediatamente, salvar no banco e manter após sair e entrar novamente.
   - Aplicar as preferências somente à sessão daquele usuário.

5. **Atualizar a identidade visual padrão**
   - Substituir o verde padrão por roxo nos tokens globais, mantendo fundo preto, contraste alto e estética gamer.
   - Criar variações semânticas para os três temas e seis cores, sem alterar componentes de negócio.

6. **Verificação**
   - Confirmar compilação e páginas em desktop e celular.
   - Testar login, retorno do Google, ausência de perfil duplicado, redirecionamento, salvamento e restauração do tema.
   - Conferir que elo, simulador, equipes, comunidade e painel administrativo continuam intactos.

## Detalhes técnicos
- O login Google usará `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`.
- A criação idempotente do perfil continuará no gatilho de novos usuários com conflito por `id` ignorado; o `player_id` único será preservado.
- A personalização será aplicada por atributos no documento e tokens CSS sem valores visuais espalhados pelas páginas.
- A migração incluirá apenas as duas novas preferências no perfil, com valores padrão e restrições válidas.
