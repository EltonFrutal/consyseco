-- Funções de gatilho não devem ser chamáveis pela API REST. O revoke de anon e
-- authenticated não bastava: o grant padrão do Postgres é para PUBLIC.
-- is_active_admin e has_admin_user ficam de fora de propósito: a primeira é
-- avaliada dentro das policies com o papel de quem consulta, e a segunda é
-- chamada pela tela de setup antes de existir sessão.
revoke execute on function public.criar_colunas_padrao() from public;
revoke execute on function public.set_updated_audit() from public;
revoke execute on function public.sincronizar_data_conclusao() from public;
revoke execute on function public.handle_new_user() from public;
