-- Integração WhatsApp (uazapi): instâncias por usuário.
-- Regra de segurança: os tokens NUNCA saem inteiros para o frontend.
-- A proteção é em duas camadas:
--   1. RLS amarrada em auth.uid() = owner_id (isolamento entre usuários);
--   2. privilégio de coluna: `authenticated`/`anon` não têm select em token/admin_token,
--      só nas colunas mascaradas geradas pelo banco.

create table if not exists public.whatsapp_instances (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  server_url text not null,
  token text not null,
  -- admintoken do servidor uazapi, guardado para recriar a instância sem redigitar
  admin_token text,
  instance_id text,
  status text not null default 'disconnected'
    check (status in ('disconnected', 'connecting', 'connected', 'hibernated')),
  last_connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  -- únicas representações dos tokens que o frontend pode ler
  token_masked text generated always as ('••••' || right(token, 4)) stored,
  admin_token_masked text generated always as (
    case when admin_token is null then null else '••••' || right(admin_token, 4) end
  ) stored
);

-- um usuário não pode ter duas instâncias com o mesmo nome
create unique index if not exists whatsapp_instances_owner_id_nome_key
  on public.whatsapp_instances (owner_id, nome);

create index if not exists whatsapp_instances_owner_id_idx
  on public.whatsapp_instances (owner_id);

alter table public.whatsapp_instances enable row level security;

drop policy if exists "Usuário lê suas instâncias" on public.whatsapp_instances;
create policy "Usuário lê suas instâncias"
  on public.whatsapp_instances for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Usuário cria suas instâncias" on public.whatsapp_instances;
create policy "Usuário cria suas instâncias"
  on public.whatsapp_instances for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Usuário altera suas instâncias" on public.whatsapp_instances;
create policy "Usuário altera suas instâncias"
  on public.whatsapp_instances for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Usuário apaga suas instâncias" on public.whatsapp_instances;
create policy "Usuário apaga suas instâncias"
  on public.whatsapp_instances for delete
  to authenticated
  using (auth.uid() = owner_id);

-- auditoria padrão do projeto (docs/padroes.md)
drop trigger if exists set_updated_audit on public.whatsapp_instances;
create trigger set_updated_audit
  before update on public.whatsapp_instances
  for each row execute function public.set_updated_audit();

-- Tokens em claro só para service_role (edge functions).
-- ATENÇÃO: revoke por coluna não basta — o grant de tabela inteira cobre todas as colunas.
-- É preciso revogar no nível da tabela e reconceder apenas as colunas seguras.
revoke select, insert, update on public.whatsapp_instances from anon, authenticated;

grant select (
  id, owner_id, nome, server_url, instance_id, status, last_connected_at,
  created_at, updated_at, updated_by, token_masked, admin_token_masked
) on public.whatsapp_instances to authenticated;

grant insert (id, owner_id, nome, server_url, instance_id, status, last_connected_at)
  on public.whatsapp_instances to authenticated;

grant update (nome, server_url, instance_id, status, last_connected_at, updated_at, updated_by)
  on public.whatsapp_instances to authenticated;

grant delete on public.whatsapp_instances to authenticated;
