-- Cenário passa a se chamar Departamento (nome do negócio, não do código),
-- a tarefa ganha classificação cadastrável e passa a aceitar anexos.

-- 1. Renomeação -------------------------------------------------------------
alter table if exists public.cenarios rename to departamentos;
alter table public.colunas rename column cenario_id to departamento_id;
alter table public.tarefas rename column cenario_id to departamento_id;

alter index if exists cenarios_nome_key rename to departamentos_nome_key;
alter index if exists colunas_cenario_nome_key rename to colunas_departamento_nome_key;
alter index if exists tarefas_cenario_id_idx rename to tarefas_departamento_id_idx;

-- o gatilho insere as etapas padrão: precisa falar o nome novo da coluna
create or replace function public.criar_colunas_padrao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.colunas (departamento_id, nome, ordem, cor, icone, is_conclusao) values
    (new.id, 'A fazer', 0, 'slate', 'lista', false),
    (new.id, 'Em andamento', 1, 'indigo', 'play', false),
    (new.id, 'Aguardando', 2, 'amber', 'relogio', false),
    (new.id, 'Concluído', 3, 'emerald', 'check', true);
  return new;
end;
$$;

revoke execute on function public.criar_colunas_padrao() from anon, authenticated;

-- policies com o nome antigo no rótulo
drop policy if exists "Admin ativo lê cenários" on public.departamentos;
drop policy if exists "Admin ativo cria cenários" on public.departamentos;
drop policy if exists "Admin ativo altera cenários" on public.departamentos;
drop policy if exists "Admin ativo apaga cenários" on public.departamentos;

create policy "Admin ativo lê departamentos" on public.departamentos
  for select to authenticated using (public.is_active_admin());
create policy "Admin ativo cria departamentos" on public.departamentos
  for insert to authenticated with check (public.is_active_admin());
create policy "Admin ativo altera departamentos" on public.departamentos
  for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "Admin ativo apaga departamentos" on public.departamentos
  for delete to authenticated using (public.is_active_admin());

-- 2. Classificação da tarefa ------------------------------------------------
create table if not exists public.classificacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists classificacoes_nome_key on public.classificacoes (lower(nome));

alter table public.classificacoes enable row level security;

drop policy if exists "Admin ativo lê classificações" on public.classificacoes;
create policy "Admin ativo lê classificações" on public.classificacoes
  for select to authenticated using (public.is_active_admin());
drop policy if exists "Admin ativo cria classificações" on public.classificacoes;
create policy "Admin ativo cria classificações" on public.classificacoes
  for insert to authenticated with check (public.is_active_admin());
drop policy if exists "Admin ativo altera classificações" on public.classificacoes;
create policy "Admin ativo altera classificações" on public.classificacoes
  for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists "Admin ativo apaga classificações" on public.classificacoes;
create policy "Admin ativo apaga classificações" on public.classificacoes
  for delete to authenticated using (public.is_active_admin());

drop trigger if exists set_updated_audit on public.classificacoes;
create trigger set_updated_audit before update on public.classificacoes
  for each row execute function public.set_updated_audit();

alter table public.tarefas
  add column if not exists classificacao_id uuid references public.classificacoes(id) on delete set null;

-- classificação é campo livre, como prioridade: não exige ser o responsável
grant update (classificacao_id) on public.tarefas to authenticated;

-- 3. Anexos da tarefa -------------------------------------------------------
create table if not exists public.tarefa_anexos (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefas(id) on delete cascade,
  -- caminho dentro do bucket privado `anexos`
  caminho text not null unique,
  nome text not null,
  tipo text,
  tamanho bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create index if not exists tarefa_anexos_tarefa_id_idx on public.tarefa_anexos (tarefa_id);

alter table public.tarefa_anexos enable row level security;

drop policy if exists "Admin ativo lê anexos" on public.tarefa_anexos;
create policy "Admin ativo lê anexos" on public.tarefa_anexos
  for select to authenticated using (public.is_active_admin());
drop policy if exists "Admin ativo cria anexos" on public.tarefa_anexos;
create policy "Admin ativo cria anexos" on public.tarefa_anexos
  for insert to authenticated with check (public.is_active_admin());
drop policy if exists "Admin ativo apaga anexos" on public.tarefa_anexos;
create policy "Admin ativo apaga anexos" on public.tarefa_anexos
  for delete to authenticated using (public.is_active_admin());

drop trigger if exists set_updated_audit on public.tarefa_anexos;
create trigger set_updated_audit before update on public.tarefa_anexos
  for each row execute function public.set_updated_audit();

-- Bucket privado, ao contrário de `avatars`: anexo de tarefa pode conter
-- documento sensível, então o acesso é sempre por URL assinada.
insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', false)
on conflict (id) do nothing;

drop policy if exists "Admin ativo lê anexos do storage" on storage.objects;
create policy "Admin ativo lê anexos do storage" on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos' and public.is_active_admin());

drop policy if exists "Admin ativo envia anexos" on storage.objects;
create policy "Admin ativo envia anexos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos' and public.is_active_admin());

drop policy if exists "Admin ativo apaga anexos do storage" on storage.objects;
create policy "Admin ativo apaga anexos do storage" on storage.objects
  for delete to authenticated
  using (bucket_id = 'anexos' and public.is_active_admin());

-- o cache do PostgREST não enxerga schema novo sozinho
notify pgrst, 'reload schema';
