# Tarefas — Auth, Setup do Primeiro Usuário e Gestão de Usuários

**Data:** 2026-08-22
**Status:** Aprovado para planejamento de implementação

## Contexto

"Tarefas" é um produto de controle de tickets/tarefas. Este é o primeiro
sub-projeto: autenticação, criação do primeiro usuário administrador, um
dashboard placeholder, e a tela de gestão de usuários. O módulo de
Tickets/Tarefas em si (criar, listar, atribuir chamados) é escopo de um
próximo spec — não faz parte desta entrega.

## Stack

- Vite + React + TypeScript + Tailwind CSS
- Supabase (projeto `projetozuper`, ref `ngppuvyeejjyoxhfjpym`) — Postgres,
  Auth, Edge Functions
- `react-router-dom` para rotas
- UI desenhada com a skill `ui-ux-pro-max` (paleta profissional, clean,
  suporte a tema claro/escuro)

## Credenciais Supabase

- Project URL: `https://ngppuvyeejjyoxhfjpym.supabase.co`
- Publishable key: `sb_publishable_QLvobTG4ENiVXBY1iT_hHA_9SSQoGT6` (segura
  para uso no browser)
- Secret key: **não incluída neste documento**. Fica apenas em variável de
  ambiente do lado servidor (Supabase Edge Functions), nunca no bundle do
  frontend, nunca commitada no repositório.

## Arquitetura

Duas camadas de acesso ao Supabase:

1. **Client direto** (via `supabase-js` com a publishable key): login,
   criação do primeiro usuário (signup), leitura do próprio perfil, e o RPC
   `has_admin_user()`.
2. **Edge Function `admin-users`**: usa a secret key só no servidor para
   operações privilegiadas de gestão de usuários (criar outro usuário,
   editar, desativar/reativar). Valida que quem chama é um admin
   autenticado com status `active` antes de agir.

Motivo de usar Edge Function em vez de um backend à parte: a API admin do
Supabase Auth (criar/editar/banir usuários) só funciona com a secret key,
que não pode nunca ir para o navegador. Edge Function roda na própria
infra do Supabase — sem servidor adicional para hospedar/manter.

## Banco de dados (Postgres via Supabase)

### Tabela `public.profiles`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK, FK para `auth.users.id` |
| `name` | text | Nome de exibição |
| `role` | text | `CHECK (role IN ('admin'))`, default `'admin'` |
| `status` | text | `CHECK (status IN ('active','disabled'))`, default `'active'` |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` |

### Trigger

`AFTER INSERT ON auth.users` → cria automaticamente a linha correspondente
em `profiles`, lendo `name` de `raw_user_meta_data->>'name'`.

### RLS (Row Level Security)

- `profiles`: `SELECT` liberado para qualquer usuário autenticado (para
  listar usuários na tela de gestão).
- `INSERT` / `UPDATE` / `DELETE` bloqueados para o client — somente a Edge
  Function (via service role, que faz bypass de RLS) altera essa tabela.

### RPC `public.has_admin_user()`

`SECURITY DEFINER`, retorna `boolean` (`true` se existir ao menos um
profile). `GRANT EXECUTE` para os papéis `anon` e `authenticated`. Usado
pela tela de login para decidir entre fluxo de setup e fluxo de login
normal, sem expor a tabela `profiles` a usuários anônimos.

## Fluxo de autenticação

1. App carrega → chama `has_admin_user()`.
   - **`false`** → tela "Criar primeira conta" (Nome, E-mail, Senha,
     Confirmar senha) → `supabase.auth.signUp()` direto do client. Como a
     confirmação de e-mail estará desativada no projeto, o signup já
     retorna sessão ativa. O trigger cria o profile como admin. Redireciona
     para `/dashboard`.
   - **`true`** → tela de login normal (E-mail, Senha) →
     `signInWithPassword()` → redireciona para `/dashboard`.
2. Sessão gerenciada pelo `supabase-js` (persistência automática) + um
   `AuthProvider` React que expõe usuário/perfil atual e protege rotas
   privadas (redireciona para `/login` se não autenticado).

## Telas

- **`/login`**: componente único que decide setup vs. login com base no
  RPC `has_admin_user()` (com estado de loading enquanto verifica).
- **`/dashboard`**: layout com sidebar + topbar (nome do usuário, botão
  sair, toggle de tema claro/escuro) e área de conteúdo com placeholder —
  ponto de extensão futuro para o módulo de Tickets/Tarefas.
- **`/usuarios`**: tabela (nome, e-mail, status, criado em) + botão "Novo
  usuário" (modal: nome/e-mail/senha) + ações **Editar** (modal:
  nome/e-mail/senha) e **Desativar/Reativar** (com confirmação).

## Edge Function `admin-users`

Recebe o token do usuário logado. Valida via `supabase.auth.getUser(token)`
que quem chama é um admin com `status = 'active'` (consultando `profiles`).
Só então usa a secret key internamente para:

- **create**: `admin.createUser()` com `email_confirm: true`.
- **update**: `admin.updateUserById()` para nome/e-mail/senha.
- **set-status**: `ban_duration` longo para desativar, `'none'` para
  reativar.

Erros retornam JSON padronizado `{ error: string }` com status HTTP
apropriado: `401` não autenticado, `403` não é admin, `409` e-mail
duplicado, etc.

## Desativar usuário

"Desativar" bloqueia o login (via `ban_duration`) mas não apaga nenhum
dado — o usuário pode ser reativado depois. Não há exclusão definitiva
nesta entrega.

## Configuração do projeto Supabase

- Desativar "Enable email confirmations" em Authentication → Providers →
  Email.
- Aplicar migration SQL (tabela `profiles`, trigger, RPC, políticas RLS)
  via Supabase CLI (`npx supabase`).
- Deploy da Edge Function via Supabase CLI.

## Validação e erros

- **Client-side**: campos obrigatórios, senha mínima de 6 caracteres,
  confirmação de senha, formato de e-mail — validados antes de chamar o
  Supabase.
- **Server-side**: constraints do Postgres (e-mail único, nativo do
  `auth.users`) + a Edge Function valida permissão de admin.
- Mensagens de erro do Supabase traduzidas para PT-BR (e-mail já
  cadastrado, credenciais inválidas, etc).

## Testes

Sem suíte automatizada nesta primeira entrega — validação manual dos
fluxos reais no navegador local (criar primeiro usuário, login, logout,
criar/editar/desativar usuário). Testes automatizados podem ser
adicionados em uma etapa futura, se desejado.

## Fora de escopo

- Módulo de Tickets/Tarefas (CRUD de tarefas, atribuição, etc.) — próximo
  sub-projeto.
- Papéis de usuário além de "Administrador".
- Exclusão definitiva de usuários.
- Recuperação de senha / "esqueci minha senha" (não mencionado no pedido
  original — pode ser adicionado depois se necessário).
