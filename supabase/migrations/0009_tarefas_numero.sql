-- Número sequencial legível da tarefa (o uuid não serve para conversar).
alter table public.tarefas add column if not exists numero bigint;

create sequence if not exists public.tarefas_numero_seq owned by public.tarefas.numero;

-- numera o que já existe na ordem de criação
with ordenadas as (
  select id, row_number() over (order by created_at, id) as n from public.tarefas
)
update public.tarefas t
   set numero = o.n
  from ordenadas o
 where o.id = t.id and t.numero is null;

select setval('public.tarefas_numero_seq', coalesce((select max(numero) from public.tarefas), 0) + 1, false);

alter table public.tarefas alter column numero set default nextval('public.tarefas_numero_seq');
alter table public.tarefas alter column numero set not null;

create unique index if not exists tarefas_numero_key on public.tarefas (numero);
