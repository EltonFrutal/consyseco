-- add phone to profiles
alter table public.profiles add column if not exists phone text;

-- keep the signup trigger in sync with the new column
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    nullif(new.raw_user_meta_data->>'phone', '')
  );
  return new;
end;
$$;
