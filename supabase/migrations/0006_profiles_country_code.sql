-- DDI do usuário, usado para montar o número internacional no envio de mensagens.
alter table public.profiles
  add column if not exists country_code text not null default '55';

alter table public.profiles
  drop constraint if exists profiles_country_code_check;

alter table public.profiles
  add constraint profiles_country_code_check check (country_code ~ '^[0-9]{1,4}$');

-- o trigger de novos usuários também passa a gravar o DDI vindo do metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone, country_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    nullif(new.raw_user_meta_data->>'phone', ''),
    coalesce(nullif(new.raw_user_meta_data->>'country_code', ''), '55')
  );
  return new;
end;
$$;
