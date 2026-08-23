-- Quem não é o responsável só altera etapa, prioridade e descrição direto pela API.
-- Título, solicitante, responsável, executor e prazo passam a exigir a edge
-- function `salvar-tarefa`, que confere quem está alterando (e a senha do
-- responsável, quando for outra pessoa).
revoke update on public.tarefas from anon, authenticated;

grant update (coluna_id, descricao, prioridade, ordem, updated_at, updated_by)
  on public.tarefas to authenticated;
