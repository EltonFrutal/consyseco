-- Classificações iniciais. Backfill de dado fica em arquivo separado do schema.
insert into public.classificacoes (nome, ordem) values
  ('Correção', 0),
  ('Módulo novo', 1),
  ('Sistema novo', 2),
  ('Suporte', 3),
  ('Melhoria', 4)
on conflict do nothing;
