-- Padrão de auditoria: toda tabela ganha updated_at / updated_by.
-- updated_by aponta para public.profiles para permitir o embed do PostgREST.
alter table public.profiles add column if not exists updated_by uuid references public.profiles(id) on delete set null;

-- Preenche updated_at e updated_by automaticamente em qualquer update.
-- Um updated_by informado explicitamente (ex.: edge function com service role) tem prioridade.
create or replace function public.set_updated_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.updated_by is not distinct from old.updated_by then
    new.updated_by := coalesce(auth.uid(), old.updated_by);
  end if;
  return new;
end;
$$;

drop trigger if exists set_updated_audit on public.profiles;
create trigger set_updated_audit
  before update on public.profiles
  for each row execute function public.set_updated_audit();
