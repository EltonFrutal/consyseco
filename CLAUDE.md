# CLAUDE.md — contrato operacional deste repositório

Leia este arquivo inteiro antes de começar qualquer tarefa. Ele vale para qualquer agente de IA que trabalhe aqui.
Padrões de UI e de banco detalhados vivem em [`docs/padroes.md`](docs/padroes.md) — este arquivo manda; `docs/padroes.md` complementa.

---

## 1. Visão geral do projeto

- **O que é:** aplicação web de gestão de tarefas (nome do pacote: `tarefas`), em estágio inicial.
- **Para quem:** uso interno; o acesso é fechado e todo usuário é criado por um administrador.
- **Domínio hoje:** autenticação, setup do primeiro admin, **gestão de usuários** (criar, editar, foto, telefone, DDI, ativar/desativar), **integração WhatsApp via uazapi**. O dashboard ainda é um esqueleto.
- **Modelo de acesso:** só existe o papel `admin` (`profiles.role` tem check `role in ('admin')`). Usuário desativado é banido no Auth **e** marcado como `disabled` no perfil.
- **Idioma:** toda a interface e as mensagens de erro são em **português do Brasil**.

## 2. Stack e versões

| Camada | Tecnologia |
|---|---|
| Build | Vite 5 (`@vitejs/plugin-react`) |
| UI | React 18.3 + TypeScript 5.5 (`strict: true`) |
| Estilo | Tailwind CSS 4 via plugin `@tailwindcss/vite` (**sem `tailwind.config.js`** — configuração fica no CSS) |
| Rotas | `react-router-dom` 6 |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions) — `@supabase/supabase-js` 2 |
| Gerenciador | **npm** (existe `package-lock.json`; não usar pnpm/yarn) |
| CLI | Supabase CLI disponível via `npx supabase` |

Não há biblioteca de estado global, de formulário ou de validação. Estado é `useState` + contexto (`src/contexts/AuthContext.tsx`). **Não introduzir dependência nova sem perguntar.**

## 3. Comandos essenciais

```bash
npm install          # instalar dependências
npm run dev          # servidor de desenvolvimento (Vite)
npm run build        # typecheck (tsc -b) + build de produção  ← é o gate de qualidade
npm run preview      # servir o build
```

- **Não existe script de `lint` nem de `test`.** O `typecheck` está embutido no `npm run build` (`tsc -b`). Enquanto não houver ESLint configurado, `npm run build` é o comando obrigatório antes de entregar.
- Migrations: escrever o arquivo em `supabase/migrations/` **e** aplicar no projeto Supabase (MCP do Supabase ou `npx supabase db push`). Código e banco andam juntos.
- Edge Functions: após editar `supabase/functions/<nome>/index.ts`, **fazer o deploy** — editar o arquivo local não muda o que roda em produção.

## 4. Arquitetura e estrutura de pastas

```
src/
  api/            # chamadas ao backend (adminUsers.ts, whatsapp.ts → edge functions; avatars.ts → storage)
  components/
    auth/         # LoginForm, SetupForm
    layout/       # AppLayout (sidebar + header), ThemeToggle
    ui/           # componentes genéricos (ConfirmDialog)
    users/        # UsersTable, UserFormModal
    whatsapp/     # InstanceForm, QrConnect, ConnectedCard, DeleteInstanceDialog
  contexts/       # AuthContext (sessão + profile do usuário logado)
  hooks/          # useHasAdminUser
  lib/            # supabaseClient, authErrors (tradução de mensagens do Auth)
  pages/          # LoginPage, DashboardPage, UsersPage, WhatsAppPage
  routes/         # ProtectedRoute
  types/          # profile.ts (à mão) e database.ts (gerado pelo Supabase)
supabase/
  migrations/     # 0001_init … 0005_whatsapp_instances, 0006_profiles_country_code
  functions/
    admin-users/  # operações privilegiadas de usuário: create, update, set-status
    wa-instance-create|qr|status|delete/  # integração uazapi (uma função por operação)
    wa-send-test/ # envio de mensagem de teste pela instância do usuário
docs/padroes.md   # padrões de UI e de auditoria
```

**Fluxo de dados:**
- Leitura → `supabase.from(...)` direto do cliente, protegido por RLS.
- Escrita privilegiada (criar usuário, trocar senha/e-mail, banir) → **edge function `admin-users`**, que valida o chamador (`role = 'admin'` e `status = 'active'`) antes de usar a `service_role`.
- Upload de foto → `supabase.storage` direto do cliente, protegido por policy de bucket.

## 5. Convenções de código

- Componentes em `PascalCase`, arquivo com o mesmo nome; funções e variáveis em `camelCase`.
- **Export nomeado** (`export function X`), não `export default`.
- Sem ponto e vírgula, aspas simples, indentação de 2 espaços — seguir o estilo do arquivo vizinho.
- Classes Tailwind escritas por extenso. Quando a lista repete, extrair para uma constante no topo do arquivo (`const inputClass = '...'`), como em `UserFormModal.tsx`.
- Tipos de domínio em `src/types/`. `tsconfig` tem `noUnusedLocals` e `noUnusedParameters` ligados: import ou parâmetro sobrando quebra o build.
- Textos visíveis e mensagens de erro sempre em português; erros do Supabase passam por tradução (`src/lib/authErrors.ts`, `translateError` na edge function).
- Comentários só quando explicam o *porquê* — o código já diz o *o quê*.

## 6. Segurança — regras inegociáveis

- **RLS ligada em 100% das tabelas.** Nenhuma tabela vai para o banco sem `alter table ... enable row level security;`. O padrão é *deny by default*: sem policy, ninguém lê nem escreve. Tabela nova sem policy explícita é **bug de segurança**, não pendência.
- **Nunca escrever policy com `using (true)`** em tabela que contenha dado de usuário. Toda policy amarra em `auth.uid()` ou em função de autorização auditável (`public.is_active_admin()`).
- **`.env.local` e variantes sempre no `.gitignore`** (já cobertos por `.env.local` e `.env*.local`). Se um `.env` for parar no histórico, a chave precisa ser **rotacionada** — remover do histórico não basta.
- **Manter `.env.local.example` versionado**, com todas as chaves necessárias e valores vazios.
- **Segredos nunca no chat.** Precisando de uma secret nova: criar a entrada vazia em `.env.local` e em `.env.local.example`, explicar onde obter o valor e **pedir ao usuário para colar direto no arquivo**. Jamais pedir, aceitar ou repetir uma secret no chat, em commit, em log, em comentário ou em mensagem de erro. Se o usuário colar uma secret no chat, avisar que ela deve ser considerada comprometida e rotacionada.
- **ARMADILHA CRÍTICA DO VITE:** toda variável com prefixo `VITE_` é **embutida no bundle e é pública**. Só podem ser `VITE_*`: a URL do Supabase e a chave publicável/`anon`. `SERVICE_ROLE_KEY`, secrets de terceiros e webhooks **nunca** recebem prefixo `VITE_` e nunca são importados em `src/`. Eles vivem apenas em Edge Functions.
- **`service_role` nunca no frontend.** Para burlar RLS, usar Edge Function com validação de identidade explícita — é o que `admin-users` faz: lê o JWT do chamador, confirma `role = 'admin'` e `status = 'active'`, e só então usa a chave privilegiada.
- Validação no cliente é UX, não segurança. Regra de negócio crítica é replicada no banco (constraints, policies, triggers) ou na Edge Function.
- Nunca confiar em estado de rota do React para autorização. `ProtectedRoute` é conveniência; a proteção real é a RLS.
- **Buckets de Storage também têm policy.** O bucket `avatars` é **público para leitura por decisão consciente** (foto de perfil exibida sem URL assinada); escrita é restrita a admin ativo. Bucket público nunca é o padrão — documente a decisão aqui antes de criar outro.
- Nunca logar tokens, JWTs ou payloads de autenticação no console.
- Antes de qualquer commit, conferir que não há secret, token, URL de webhook ou dump de dados reais no diff.

## 7. Supabase — banco, RLS e migrations

- Toda mudança de schema vira **migration versionada** em `supabase/migrations/` (`NNNN_descricao.sql`, sequencial). Alteração feita à mão pelo dashboard é proibida: o estado do banco tem que ser reproduzível a partir do repositório.
- Migration idempotente sempre que possível (`if not exists`, `create or replace`, `drop policy if exists` antes do `create policy`) e **acompanhada das policies de RLS da tabela criada, no mesmo arquivo**.
- Após alterar o schema, **atualizar os tipos TypeScript**. Hoje os tipos são escritos à mão em `src/types/`; ao gerar com `npx supabase gen types typescript`, commitar o arquivo gerado. Tipo desatualizado é bug silencioso — o cast `as Profile` esconde a divergência até o runtime.
- **Depois de criar coluna ou FK nova, rodar `notify pgrst, 'reload schema';`** — o cache do PostgREST não enxerga o schema novo sozinho e a API responde `PGRST200`.
- Nunca rodar `supabase db reset` ou comando destrutivo contra ambiente remoto sem confirmação explícita do usuário na conversa.
- Queries no front sempre tipadas; **nada de `any`** no retorno do client.
- Migration de dado (backfill) é arquivo separado da migration de schema.
- Rodar o *security advisor* do Supabase depois de mudanças de DDL e tratar o que aparecer.

## 8. UI/UX — uso obrigatório da skill

- **Sempre que a tarefa envolver criar ou alterar telas, layouts, componentes visuais ou fluxos de navegação, usar a skill de UI/UX (UI/UX Pro Max) antes de escrever código.** Primeiro a decisão de design, depois a implementação.
- Não improvisar visual: seguir os tokens do projeto (cores, espaçamento, tipografia, raio, sombra). Este projeto usa **Tailwind 4 sem `tailwind.config.js`** — a paleta é a padrão do Tailwind e os tokens customizados, quando existirem, ficam em `src/index.css` (`@theme`). Nada de valor mágico solto no JSX quando existe token.
- Responsivo mobile-first e estados obrigatórios em toda tela: **loading, vazio, erro e sucesso**. Tela sem estado de erro não está pronta.
- Acessibilidade mínima: foco visível, label em todo input, contraste adequado, navegação por teclado.
- **Tema claro/escuro:** toda cor precisa do par `dark:`. O tema é uma classe `dark` no `<html>`, controlada por `ThemeToggle`.
- Padrões visuais fechados com o usuário (ver `docs/padroes.md`): ações **somente ícone** (com `aria-label` e `title`), clique na linha abre a edição, status booleano como chave liga/desliga, colunas de auditoria no fim da listagem.

## 9. Definition of Done e fluxo de entrega

Uma entrega só está concluída quando **todos** os itens forem verdadeiros:

1. `npm run build` passa (inclui o typecheck `tsc -b`). Quando houver script de lint, ele também passa.
2. Build de produção passa sem warning novo relevante.
3. Testes end-to-end via **Playwright MCP** executados e verdes (seção 10).
4. Migrations criadas, **aplicadas no Supabase** e tipos atualizados.
5. RLS verificada nas tabelas tocadas (e advisor de segurança sem regressão).
6. Nenhuma secret no diff; `.env.local` fora do versionamento.
7. **Código commitado no Git** com mensagem descritiva, e as **migrations correspondentes aplicadas no Supabase** — código e banco sempre no mesmo estado. Nunca deixar código dependente de schema que não foi para o banco, nem migration aplicada sem o código commitado. Edge Function alterada exige **deploy** no mesmo momento.
8. Seção "Armadilhas conhecidas" atualizada se algo novo foi aprendido.

Se algum item não puder ser cumprido, **declarar explicitamente o que ficou pendente** em vez de dizer que terminou.

## 10. Testes com Playwright (MCP)

- Toda entrega passa por teste usando o **MCP do Playwright**, executado contra a aplicação rodando (`npm run dev`).
- Cobertura mínima por entrega: **caminho feliz** do fluxo alterado, **pelo menos um caminho de erro/validação**, e verificação de que a **autorização funciona** (usuário sem permissão não enxerga nem altera o que não é dele).
- Testar em pelo menos **uma viewport mobile e uma desktop** quando houver mudança de UI.
- Ao final, reportar: o que foi testado, o resultado, e o que **não** foi testado.
- Teste que falha não é "flaky" por decreto: investigar antes de reexecutar.
- **Nunca usar dados reais de produção nos testes.** Este projeto aponta para um único ambiente Supabase — criar usuários de teste identificáveis e limpá-los ao final.
- Se o MCP do Playwright não estiver conectado na sessão, **avisar o usuário e declarar o teste como pendente** — não substituir por "compilou, então está certo".

## 11. Armadilhas conhecidas e log de erros

Seção **viva e append-only**. Sempre que um bug custar mais de ~15 minutos, gerar retrabalho ou revelar comportamento não óbvio da stack, registrar aqui **antes de encerrar a tarefa**.

Formato:

```
### [AAAA-MM-DD] Título curto do problema
- **Sintoma:** o que se observou (mensagem de erro, comportamento)
- **Causa raiz:** por que acontecia de verdade
- **Solução:** o que resolveu
- **Prevenção:** a regra que evita a recorrência
- **Arquivos:** caminhos envolvidos
```

### Armadilhas da stack (válidas desde o dia 1)

- `VITE_*` é público e vai para o bundle do cliente.
- Tabela criada sem RLS fica exposta pela API REST do Supabase automaticamente.
- Policy de `SELECT` não protege `INSERT`/`UPDATE`/`DELETE`: cada operação precisa da sua policy.
- Tipos do Supabase desatualizados após migration causam erro em **runtime**, não em compile — pior ainda quando há `as Tipo`.
- `select()` sem filtro em tabela grande derruba performance; paginar sempre.
- Sessão do Supabase Auth expira: tratar refresh e o estado "carregando sessão" antes de decidir redirecionar.
- Classes Tailwind construídas por concatenação dinâmica (`bg-${cor}-500`) somem no purge — escrever a classe inteira nos dois ramos do ternário.
- Variável de ambiente nova exige **restart do servidor do Vite**.
- Editar `supabase/functions/**` não altera o que roda em produção enquanto não houver **deploy**.

### [2026-08-22] Embed do PostgREST em FK auto-referenciada (`PGRST200`)
- **Sintoma:** listagem de usuários parou de carregar; `GET /rest/v1/profiles?select=*,updated_by_profile:profiles!profiles_updated_by_fkey(name)` respondia **400** com `PGRST200 — Could not find a relationship between 'profiles' and 'profiles'`.
- **Causa raiz:** duas coisas somadas — (a) o cache de schema do PostgREST ainda não conhecia a coluna/FK recém-criada; (b) quando a FK aponta para a **própria tabela**, a dica do embed precisa ser o **nome da coluna** (`updated_by`), não o nome da constraint.
- **Solução:** `notify pgrst, 'reload schema';` e trocar o select para `*, updated_by_profile:updated_by(name)`.
- **Prevenção:** depois de criar coluna/FK, recarregar o schema do PostgREST e **testar a chamada REST de verdade** antes de dizer que terminou; compilar não prova nada sobre a API.
- **Arquivos:** `src/pages/UsersPage.tsx`, `supabase/migrations/0004_audit_columns.sql`.

### [2026-08-22] Edição em bloco de JSX duplicou colunas da tabela
- **Sintoma:** cada linha da listagem renderizava as células duas vezes, com dois pares de botões. O build passava normalmente.
- **Causa raiz:** patch por substituição de texto com índices de início/fim mal calculados; JSX duplicado é sintaticamente válido, então o `tsc` não reclamou.
- **Solução:** reescrever o componente inteiro.
- **Prevenção:** depois de editar JSX por script, conferir a estrutura (ex.: contar `<td>` e handlers) — build verde não é evidência de layout correto.
- **Arquivos:** `src/components/users/UsersTable.tsx`.

### [2026-08-22] `revoke` por coluna não protege nada se o grant de tabela continuar
- **Sintoma:** depois de `revoke select (token, admin_token) ... from authenticated`, o `information_schema.column_privileges` continuava listando `token` como legível por `authenticated` — o segredo seguia exposto pela API REST.
- **Causa raiz:** no Postgres, um `GRANT SELECT` na tabela inteira cobre todas as colunas, inclusive as futuras. Revogar coluna a coluna não remove esse grant abrangente.
- **Solução:** `revoke select, insert, update on <tabela> from anon, authenticated` e reconceder **apenas a lista de colunas seguras** (`grant select (col1, col2, ...) ... to authenticated`).
- **Prevenção:** ao esconder uma coluna, conferir com `select grantee, privilege_type, column_name from information_schema.column_privileges` e testar com `set local role authenticated` — esperar `42501` na coluna secreta. Consequência: o cliente **não pode usar `select('*')`** nessa tabela; precisa listar colunas.
- **Arquivos:** `supabase/migrations/0005_whatsapp_instances.sql`, `src/api/whatsapp.ts`.

### [2026-08-22] Documentação da uazapi é uma SPA — a fonte real é o JSON do OpenAPI
- **Sintoma:** `WebFetch` em `https://docs.uazapi.com` devolvia só o título "OpenAPI Documentation Generator", sem nenhum endpoint; adivinhar caminhos como `/openapi.json` retornava 200 com o HTML da SPA (fallback), o que dá falsa sensação de acerto.
- **Causa raiz:** a documentação é renderizada no cliente a partir de um arquivo carregado por fetch.
- **Solução:** abrir a página no navegador, listar as requisições de rede e baixar `https://docs.uazapi.com/openapi-bundled.json` — a especificação completa (132 paths, schemas, securitySchemes).
- **Prevenção:** para doc em SPA, achar a spec pela aba de rede em vez de adivinhar URLs; um 200 em SPA não prova que o arquivo existe.
- **Arquivos:** —

### Decisões arquiteturais

- **Escrita privilegiada isolada na edge function `admin-users`.** O frontend nunca vê a `service_role`; a função valida o chamador antes de qualquer operação. Não mover essas operações para o cliente.
- **Bucket `avatars` público para leitura.** Escolha consciente para exibir foto sem URL assinada; escrita restrita a admin ativo via `public.is_active_admin()`.
- **`profiles.updated_by` aponta para `public.profiles`, não para `auth.users`**, para permitir o embed do PostgREST trazer o nome de quem alterou.
- **Auditoria por trigger (`public.set_updated_audit`)**, com precedência para valor explícito — necessário porque a edge function roda com `service_role`, onde `auth.uid()` é nulo.
- **Usuário desativado é banido no Auth e marcado `disabled` no perfil** (dois lugares, de propósito): o ban corta a sessão, o campo alimenta a UI.
- **Integração uazapi só via Edge Function.** O navegador nunca fala com a uazapi nem recebe token: `wa-instance-create/qr/status/delete` e `wa-send-test` validam a sessão, conferem `owner_id` e repassam a mensagem de erro real da API (preferindo `message_ptbr`).
- **Token da uazapi guardado em coluna sem grant de leitura**, com colunas geradas `token_masked`/`admin_token_masked` (`••••1234`) como única forma de exibição.
- **`wa-instance-create` aceita os dois tokens:** tenta `GET /instance/status` (token de instância) e, em 401/403, tenta `POST /instance/create` com `admintoken`; o admintoken é guardado para recriar a instância depois.
- **Tailwind 4 sem arquivo de config** — não recriar `tailwind.config.js` "para padronizar".
- **Sem biblioteca de formulário/estado** — o projeto é pequeno; introduzir uma exige justificativa e aprovação.

## 12. Regras de comportamento do agente

- Ler o `CLAUDE.md` inteiro (e `docs/padroes.md`) antes de começar qualquer tarefa.
- Antes de criar arquivo/componente/lib nova, verificar se já existe algo equivalente no projeto.
- Não instalar dependência nova sem justificar e perguntar.
- Não refatorar código fora do escopo da tarefa.
- Operações destrutivas (`drop`, delete em massa, `reset`, `force push`) exigem confirmação explícita na conversa.
- Preferir perguntar a assumir quando o requisito estiver ambíguo — mas resolver sozinho o que for decisão trivial e reversível.
- Ao terminar, entregar um resumo curto: **o que mudou, o que foi testado, o que ficou pendente**.
- Não afirmar que algo funciona sem ter rodado. "Build passou" ≠ "funciona".

## 13. Auditoria — obrigatória em todas as tabelas

Toda tabela de dados nasce com os campos de auditoria. Sem exceção.

```sql
create table public.<tabela> (
  ...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.<tabela> enable row level security;
-- + policies da tabela, no mesmo arquivo

drop trigger if exists set_updated_audit on public.<tabela>;
create trigger set_updated_audit
  before update on public.<tabela>
  for each row execute function public.set_updated_audit();
```

- `public.set_updated_audit()` (definida em `supabase/migrations/0004_audit_columns.sql`) preenche `updated_at = now()` e `updated_by = auth.uid()` em qualquer update.
- **Edge Functions devem enviar `updated_by` explicitamente** (id do usuário que chamou), porque rodam com `service_role` e ali `auth.uid()` é nulo. Valor explícito tem precedência sobre o gatilho.
- **Toda listagem exibe as colunas `Criado em`, `Alterado em` (data + hora) e `Alterado por`** (nome; `—` quando nulo), no fim da tabela.
- O nome de quem alterou vem por embed: `.select('*, updated_by_profile:updated_by(name)')`.
