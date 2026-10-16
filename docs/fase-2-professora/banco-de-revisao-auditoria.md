# Banco de Revisão: auditoria antes de migrar para o site

Origem: artifact "Banco de Revisão" (https://claude.ai/artifact/21KC5jCBvhWL8jM7ft9NpP). A função: ler o Google Docs de cada aluno e
gerar automaticamente cartões "Gerados pela Professora"; a professora aprova ou corta cada item.

## O que o artifact guarda hoje
- `alunos/{id}`: nome, idioma_alvo, status, caderno_id (Google Docs), ultima_entrada_lida, codigo, lingua_referencia, aulas.
- `alunos/{id}/itens` (itens gerados), `alunos/{id}/revisoes`, `alunos/{id}/recaps`, `config/manual`.
- Telas: lista de alunos, itens pendentes (aprovar/cortar), área de revisão do aluno, estatísticas, manual, modo aula.

## Como encaixa no site (proposta, nada feito)
- Alunos: já existem em `teacher_students`; `caderno_id` e `ultima_entrada_lida` viram colunas/tabela nova ligada ao vínculo.
- Item aprovado vira linha em `teacher_flashcards` (Note nativa, Deck `teacher_root` do aluno), pelo mesmo caminho da tela Cartões.
  Item pendente fica numa tabela nova (ex.: `review_bank_items`) com status pendente/aprovado/cortado.
- Geração: precisa de backend (Edge Function) que lê o Google Docs e chama um modelo de linguagem; segredos (Google, chave do modelo) como secrets.
- Área de revisão do aluno: usa a revisão que já existe (FSRS por CardInstance), sem tela paralela.

## Perguntas para a Brune (decidir antes de codar)
1. A leitura do Google Docs: o aluno compartilha o caderno com uma conta de serviço, ou a professora cola o texto? Quem cria a conta/chave do Google?
2. Qual modelo gera os itens e quem paga o uso (chave da professora no Supabase)? Há limite por aluno por dia?
3. Os dados já existentes no artifact (alunos, itens, revisões) precisam ser importados? Se sim, como exportar (o cofre está criptografado).
4. A área de revisão do aluno do artifact (revisões, recaps, estatísticas) continua separada ou tudo passa para a Revisão normal do site?
5. "Modo aula" e "manual": entram na primeira entrega ou depois?
6. Grátis x Premium: é ferramenta da professora; o aluno vinculado já tem cartões sem teto. Alguma coisa vira Premium?
7. Migrations vão primeiro no Staging; confirma a ordem (tabelas, RLS, Edge Function, deploy) e que a autora aplica o SQL com `DROP` no SQL Editor.

## Passos manuais previstos (só depois da aprovação)
Migration (SQL Editor), secrets (Google e modelo), deploy da Edge Function, compartilhar cadernos. Código pronto não prova infraestrutura ativa.
