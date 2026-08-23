-- Executor, datas de conclusão/finalização e ícone das colunas.

-- 1. Coluna de conclusão é marcada explicitamente (o nome pode mudar por cenário).
alter table public.colunas add column if not exists is_conclusao boolean not null default false;
alter table public.colunas add column if not exists icone text not null default 'lista';

update public.colunas
   set is_conclusao = true
 where is_conclusao = false
   and lower(nome) in ('concluído', 'concluido');

-- ícones das etapas já existentes
update public.colunas set icone = 'lista'   where lower(nome) = 'a fazer'      and icone = 'lista';
update public.colunas set icone = 'play'    where lower(nome) = 'em andamento';
update public.colunas set icone = 'relogio' where lower(nome) = 'aguardando';
update public.colunas set icone = 'check'   where lower(nome) in ('concluído', 'concluido');

-- 2. Campos novos da tarefa.
alter table public.tarefas add column if not exists executor_id uuid references public.profiles(id) on delete set null;
alter table public.tarefas add column if not exists data_conclusao timestamptz;
alter table public.tarefas add column if not exists finalizada_em timestamptz;
alter table public.tarefas add column if not exists finalizada_por uuid references public.profiles(id) on delete set null;

-- o quadro só carrega o que não foi finalizado
create index if not exists tarefas_finalizada_em_idx on public.tarefas (finalizada_em);

-- 3. A data de conclusão acompanha a coluna: entra na etapa de conclusão preenche,
--    sai de lá zera. Regra no banco para valer em qualquer caminho de escrita.
create or replace function public.sincronizar_data_conclusao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  destino_conclui boolean;
begin
  select is_conclusao into destino_conclui from public.colunas where id = new.coluna_id;

  if coalesce(destino_conclui, false) then
    -- preserva a data de quando entrou pela primeira vez
    if new.data_conclusao is null then
      new.data_conclusao := now();
    end if;
  else
    new.data_conclusao := null;
    -- tarefa que volta para o fluxo deixa de estar finalizada
    new.finalizada_em := null;
    new.finalizada_por := null;
  end if;

  return new;
end;
$$;

revoke execute on function public.sincronizar_data_conclusao() from anon, authenticated;

drop trigger if exists sincronizar_data_conclusao on public.tarefas;
create trigger sincronizar_data_conclusao
  before insert or update of coluna_id on public.tarefas
  for each row execute function public.sincronizar_data_conclusao();

-- 4. Cenário novo nasce com as quatro etapas, com ícone e a marcação de conclusão.
create or replace function public.criar_colunas_padrao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.colunas (cenario_id, nome, ordem, cor, icone, is_conclusao) values
    (new.id, 'A fazer', 0, 'slate', 'lista', false),
    (new.id, 'Em andamento', 1, 'indigo', 'play', false),
    (new.id, 'Aguardando', 2, 'amber', 'relogio', false),
    (new.id, 'Concluído', 3, 'emerald', 'check', true);
  return new;
end;
$$;

revoke execute on function public.criar_colunas_padrao() from anon, authenticated;

-- 5. Finalizar é privilégio do responsável: o cliente não pode gravar esses campos.
--    ATENÇÃO: revoke por coluna não basta — o grant de tabela cobre todas as colunas.
--    É preciso revogar no nível da tabela e reconceder só as colunas editáveis.
revoke insert, update on public.tarefas from anon, authenticated;

grant insert (
  id, cenario_id, coluna_id, titulo, descricao, solicitante_id, responsavel_id,
  executor_id, prazo, prioridade, ordem
) on public.tarefas to authenticated;

grant update (
  cenario_id, coluna_id, titulo, descricao, solicitante_id, responsavel_id,
  executor_id, prazo, prioridade, ordem, updated_at, updated_by
) on public.tarefas to authenticated;
