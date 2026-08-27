# Padrões do projeto

Regras que valem para **todas as tabelas e telas**. Ao criar algo novo, seguir daqui.

## Auditoria (banco)

Toda tabela de dados nasce com:

```sql
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
updated_by uuid references public.profiles(id) on delete set null
```

E o gatilho padrão, que preenche `updated_at` e `updated_by` sozinho em qualquer update:

```sql
drop trigger if exists set_updated_audit on public.<tabela>;
create trigger set_updated_audit
  before update on public.<tabela>
  for each row execute function public.set_updated_audit();
```

`public.set_updated_audit()` (criada em `supabase/migrations/0004_audit_columns.sql`) usa `auth.uid()`.
Como as edge functions rodam com *service role* (onde `auth.uid()` é nulo), elas devem mandar
`updated_by: <id do usuário que chamou>` no update — um valor explícito tem prioridade sobre o gatilho.

`updated_by` aponta para `public.profiles` (e não para `auth.users`) para permitir o embed do PostgREST.
A dica do embed é o **nome da coluna** — usar o nome da constraint (`profiles_updated_by_fkey`) devolve
`PGRST200` quando a relação é da tabela consigo mesma. Depois de criar a coluna, rodar
`notify pgrst, 'reload schema';` para atualizar o cache do PostgREST:

```ts
.select('*, updated_by_profile:updated_by(name)')
```

## Botões

- **Salvar, Cancelar e Excluir usam `SaveButton`, `CancelButton` e `DeleteButton`**
  (`src/components/ui/ActionButtons.tsx`): **Salvar** (disquete) e **Cancelar** (X) levam
  ícone + texto; **Excluir** é só a lixeira, em 44px com `aria-label`/`title`.
  Ações com nome próprio ("Salvar e conectar", "Remover mesmo assim") continuam com texto.
- **Ação de incluir usa sempre o `AddButton`** (`src/components/ui/AddButton.tsx`): **redondo**,
  44px, **verde** (`emerald-600`), somente o ícone de `+`, com `aria-label` e `title` descrevendo
  a ação ("Novo usuário", "Nova tarefa", "Adicionar coluna"). Nunca escrever o texto no botão.
  Redondo e verde é a assinatura de "incluir" no sistema: nenhuma outra ação usa essa combinação,
  então a pessoa reconhece o botão antes de ler qualquer coisa. Vale também para o botão
  flutuante do mobile, que é o mesmo "incluir" em outra posição.
- Demais ações de linha (editar, excluir, ativar/desativar) também são **somente ícone**,
  com `aria-label` e `title`.
- Botões de formulário dentro de modal (Salvar / Cancelar) continuam com texto.

## Auditoria na tela de edição

- Toda modal de edição mostra, no rodapé e em texto discreto (11px, cinza):
  **Criada em**, **Alterada em** e **por quem** — e, quando existir, a data de conclusão.
  Não é um bloco destacado: é rodapé.

## Listagens

- Colunas de auditoria no fim da tabela: **Criado em**, **Alterado em** (data + hora), **Alterado por** (nome; `—` quando nulo).
- **Clicar na linha abre a modal de edição** do registro. A linha tem `role="button"`, `tabIndex={0}`,
  `aria-label`, responde a Enter/Espaço e mostra `cursor-pointer` + realce no hover.
- Botões de ação dentro da linha usam `e.stopPropagation()` para não dispararem a edição.

## Botões e ícones

- Ações são **somente ícone** — sem texto. Sempre com `aria-label` e `title` descritivos.
- SVG inline, `stroke="currentColor"`, `strokeWidth="1.5"`, pontas arredondadas, 18px.
- Fundo colorido suave por intenção: indigo = editar, vermelho = desativar, verde = reativar/ativo.
  No tema escuro, mesma cor com 10% de opacidade (20% no hover).
- Status booleano é exibido como **chave liga/desliga**: verde com o botão à direita quando ativo,
  cinza com o botão à esquerda quando inativo.
- Botões primários de formulário (Salvar/Cancelar) continuam com texto.

## Confirmação antes de agir

Toda ação **destrutiva ou difícil de desfazer** pergunta antes, no componente
`ConfirmDialog` (`src/components/ui/ConfirmDialog.tsx`). Sem exceção:

- excluir qualquer registro (tarefa, departamento, etapa, classificação, anexo);
- finalizar e reabrir tarefa;
- desativar usuário.

Regras da pergunta:

1. **O título diz o que vai acontecer**, com o nome ou número do registro:
   "Excluir o departamento Suporte?", não "Tem certeza?".
2. **A descrição diz a consequência**, principalmente o efeito em cascata:
   "As etapas e todas as tarefas dele são excluídas junto."
3. **O rótulo do botão repete a ação** ("Sim, excluir", "Sim, finalizar"), nunca
   só "OK" — em diálogo de confirmação, "OK" não diz a que se está concordando.
4. **`tom="perigo"` (vermelho) só quando há perda de dado.** Ação reversível usa
   `tom="positivo"` (verde); vermelho em ação reversível ensina a ignorar o
   vermelho.
5. **A confirmação vem antes da senha.** Quando a ação também exige a senha do
   responsável, a ordem é confirmar → pedir senha. O contrário obriga a pessoa a
   digitar a senha para só depois descobrir o que vai acontecer, e a desistência
   fica cara.

## Fotos / uploads

- Bucket público `avatars`, limite de 2 MB, JPG/PNG/WEBP/GIF; escrita só para admin ativo.
- No formulário: avatar redondo clicável abre o seletor de arquivo; no hover surge a sobreposição
  com os ícones de trocar (lápis) e remover (lixeira). Sem textos auxiliares.
