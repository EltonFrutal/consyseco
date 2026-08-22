-- Kanban: cenários (quadros) → colunas (etapas) → tarefas (cartões).
-- Acesso: todo admin ativo enxerga e edita — amarrado em public.is_active_admin(),
-- nunca em using (true).

create table if not exists public.cenarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists cenarios_nome_key on public.cenarios (lower(nome));

create table if not exists public.colunas (
  id uuid primary key default gen_random_uuid(),
  cenario_id uuid not null references public.cenarios(id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  -- token de cor (slate, indigo, emerald, amber, red...) e não classe Tailwind,
  -- porque classe montada por concatenação some no purge
  cor text not null default 'slate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists colunas_cenario_nome_key
  on public.colunas (cenario_id, lower(nome));

create table if not exists public.tarefas (
  id uuid primary key default gen_random_uuid(),
  cenario_id uuid not null references public.cenarios(id) on delete cascade,
  coluna_id uuid not null references public.colunas(id) on delete cascade,
  titulo text not null,
  descricao text,
  solicitante_id uuid references public.profiles(id) on delete set null,
  responsavel_id uuid references public.profiles(id) on delete set null,
  prazo date,
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta')),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create index if not exists tarefas_coluna_id_idx on public.tarefas (coluna_id);
create index if not exists tarefas_cenario_id_idx on public.tarefas (cenario_id);

-- Cenário novo já nasce com as três etapas usuais.
create or replace function public.criar_colunas_padrao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.colunas (cenario_id, nome, ordem, cor) values
    (new.id, 'A fazer', 0, 'slate'),
    (new.id, 'Em andamento', 1, 'indigo'),
    (new.id, 'Concluído', 2, 'emerald');
  return new;
end;
$$;

revoke execute on function public.criar_colunas_padrao() from anon, authenticated;

drop trigger if exists criar_colunas_padrao on public.cenarios;
create trigger criar_colunas_padrao
  after insert on public.cenarios
  for each row execute function public.criar_colunas_padrao();

-- auditoria padrão (docs/padroes.md)
drop trigger if exists set_updated_audit on public.cenarios;
create trigger set_updated_audit before update on public.cenarios
  for each row execute function public.set_updated_audit();

drop trigger if exists set_updated_audit on public.colunas;
create trigger set_updated_audit before update on public.colunas
  for each row execute function public.set_updated_audit();

drop trigger if exists set_updated_audit on public.tarefas;
create trigger set_updated_audit before update on public.tarefas
  for each row execute function public.set_updated_audit();

alter table public.cenarios enable row level security;
alter table public.colunas enable row level security;
alter table public.tarefas enable row level security;

drop policy if exists "Admin ativo lê cenários" on public.cenarios;
create policy "Admin ativo lê cenários" on public.cenarios
  for select to authenticated using (public.is_active_admin());
drop policy if exists "Admin ativo cria cenários" on public.cenarios;
create policy "Admin ativo cria cenários" on public.cenarios
  for insert to authenticated with check (public.is_active_admin());
drop policy if exists "Admin ativo altera cenários" on public.cenarios;
create policy "Admin ativo altera cenários" on public.cenarios
  for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists "Admin ativo apaga cenários" on public.cenarios;
create policy "Admin ativo apaga cenários" on public.cenarios
  for delete to authenticated using (public.is_active_admin());

drop policy if exists "Admin ativo lê colunas" on public.colunas;
create policy "Admin ativo lê colunas" on public.colunas
  for select to authenticated using (public.is_active_admin());
drop policy if exists "Admin ativo cria colunas" on public.colunas;
create policy "Admin ativo cria colunas" on public.colunas
  for insert to authenticated with check (public.is_active_admin());
drop policy if exists "Admin ativo altera colunas" on public.colunas;
create policy "Admin ativo altera colunas" on public.colunas
  for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists "Admin ativo apaga colunas" on public.colunas;
create policy "Admin ativo apaga colunas" on public.colunas
  for delete to authenticated using (public.is_active_admin());

drop policy if exists "Admin ativo lê tarefas" on public.tarefas;
create policy "Admin ativo lê tarefas" on public.tarefas
  for select to authenticated using (public.is_active_admin());
drop policy if exists "Admin ativo cria tarefas" on public.tarefas;
create policy "Admin ativo cria tarefas" on public.tarefas
  for insert to authenticated with check (public.is_active_admin());
drop policy if exists "Admin ativo altera tarefas" on public.tarefas;
create policy "Admin ativo altera tarefas" on public.tarefas
  for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists "Admin ativo apaga tarefas" on public.tarefas;
create policy "Admin ativo apaga tarefas" on public.tarefas
  for delete to authenticated using (public.is_active_admin());
