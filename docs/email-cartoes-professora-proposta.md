# E-mail "cartões novos da professora" (proposta, 2026-11-23)

Prévia aprovada para desenho; **nada implementado ainda**. Prévia visual: `docs/email/previas/cartoes-professora.html` (4 e-mails: novos e lembrete, em pt-BR e en).

## Por que
Medido em 2026-11-19 (uso dos últimos 30 dias, 14 alunos ativos): quem entra no site responde os cartões da professora (6 de 9 com cartões, todos com mais de 20 respostas). O problema é voltar ao site: 0 de 14 ativaram notificações no celular, e não existe e-mail de aviso de cartões novos. Quem não entra (ex.: Carol, 17 cartões novos na semana) não vê nada.

## O que o aluno recebe (no máximo 1 e-mail por dia)
- **Novos**: de manhã, só quando entraram cartões novos vindos do Banco de Revisão desde o último e-mail. Assunto "Você tem N cartões novos da sua professora".
- **Lembrete**: só se não há cartões novos hoje, a pessoa está parada há 7 dias ou mais (último uso no site), tem cartões esperando e não recebeu lembrete nos últimos 7 dias. Para depois de 3 lembretes seguidos sem a pessoa voltar; volta a valer quando ela voltar.
- Idioma do site de quem recebe (nada em português no site em inglês). Padrão Prof Brune (`docs/email/PADRAO-EMAIL.md`), com versão em texto puro.
- Só aluno com vínculo ativo e e-mail. Link "Parar de receber" assinado (1 clique) e chave em Configurações > Notificações.

## Como funciona por dentro
- Nova Edge Function `teacher-cards-digest` (separada do `notification-cron`), agendada às 11:00 UTC (08h de Brasília), com senha no cabeçalho como o `notification-cron`. Envia pelo Resend (secrets e domínio já existentes).
- Tabela de registro (aluno, data, tipo, quantidade) garante 1 por dia e não repetir. Tabela de ajuste com modo `desligado | teste | todos` e a lista do teste.
- Preferência nova do aluno: categoria `cartoes_professora`, ligada por padrão para alunos vinculados (decisão da dona pendente: os e-mails de hoje exigem aceitar antes).
- Custo: no máximo 14 e-mails por dia hoje.

## Teste primeiro com 2 alunas (decisão da dona)
Modo `teste` com 2 pessoas por alguns dias; só depois `todos`. Sugestão: Raíssa (usa bastante, testa o "novos") e Carol (parada, testa o lembrete). A dona escolhe.

## Grátis x Premium
Tudo grátis.

## Falta decidir / fazer
1. Quais 2 alunas no teste; 2. ligar por padrão para os alunos ou só quem aceitar; 3. horário (08h de Brasília).
Depois: migration (2 tabelas + preferência), função, agendamento, testes, e-mail de teste para a dona, OK dela antes de ligar qualquer envio a aluna.

## Construído em 2026-11-23 (decisões da dona: teste com Raíssa e Carol, ligado por padrão, 8h de Brasília)
- Migration `141_teacher_cards_digest` (Staging aplicada; produção NÃO aplicada): tabelas `teacher_cards_digest_settings` (modo, padrão `desligado`) e `teacher_cards_digest_log`, função `_cards_digest_post()`. O agendamento (`teacher-cards-digest-diario`, `0 11 * * *`) NÃO é criado pela migration: só depois do e-mail de teste da dona.
- Edge Function `teacher-cards-digest` (`supabase/functions/teacher-cards-digest/`, `core.mjs` puro + `index.ts`; deploy com `verify_jwt:false`): POST com `x-cron-token` roda o envio; `?u=&t=` (GET ou POST) = "Parar de receber" assinado; `test_to` manda e-mail de teste só para o endereço dado.
- Configurações > Notificações ganha a linha "Cartões novos da professora" (só e-mail, ligada por padrão; `shared/notification-preferences.js`).
- Testes: `node tests/email-cartoes-professora/test_core.js` (31) e `test_function.js` (19, banco e Resend de mentira).
- IDs do teste (produção): Raíssa `f22719c9-1381-4635-a21a-52375f1422c9`, Carol `d079a986-52ee-4166-96ff-2774369c901d`.
- Roteiro para ligar: PR e merge; migration 141 na produção; deploy da função; segredo `cards_digest_url` no Vault; linha em `teacher_cards_digest_settings` (modo `teste`); e-mail de teste só para a dona; OK dela; agendar o cron; depois do teste, modo `todos`.

## Ajustes da revisão do PR #491 (2026-11-24)
- Marca do topo do e-mail em inglês: `LANGUAGES WITH PROF BRUNE` (antes aparecia `IDIOMAS COM PROF BRUNE`).
- Link de sair: GET só mostra a confirmação (botão que envia POST); só o POST grava. Evita antivírus e pré-visualizadores desligarem o aviso sozinhos.
- Assinatura do link com chave PRÓPRIA: Vault `cards_digest_signing_key` (gerada no banco pela migration 142, lida por `cards_digest_signing_key()`, só service role). Links já enviados (assinados com a senha do agendamento) continuam valendo; retirar essa conferência uns 30 dias depois.
- Testes: `test_core.js` 33 e `test_function.js` 23.


## Página "Parar de receber" v2 e resumo semanal (2026-11-26)

Decisões da dona (conversa de 25 e 26/11, prévia `docs/email/previas/sair-cartoes-previa.html`, pesquisa de 12 marcas no Gmail dela):
- A página do site `sair-cartoes/` (não mais HTML da função, que o Supabase entrega como `text/plain`) tem na 1ª tela: motivo (lista vertical:
  recebo e-mails demais, estou sem tempo agora, os cartões não servem para mim, não é mais do meu interesse, prefiro ver tudo no site, outro motivo),
  "Parar de receber", "Prefiro 1 resumo por semana" e "Continuar recebendo". O motivo é pedido com destaque, mas **não trava** o botão
  (o "cancelar inscrição" do Gmail nunca mostra a tela; nenhuma das 12 marcas pesquisadas exige motivo; sair não pode depender de resposta).
- "Pronto" e "Combinado: 1 resumo por semana" trazem "Foi sem querer? Voltar a receber" (POST `a=voltar`, sem login: vale a assinatura do link).
- Resumo semanal: sem escolha de dia ou hora (decisão: menos atrito). Sempre **domingo de manhã**, no mesmo agendamento das 11h UTC (8h de
  Brasília); só para quem escolheu; conta só cartões criados desde o último e-mail (ou 7 dias); não manda e-mail vazio. UTM `cartoes_semanal`.
- Motivos ficam **anônimos** (sem user_id nem e-mail), para a promessa "não fica no seu perfil de estudo" ser verdadeira. Leitura:
  função `cards_digest_exit_summary()` (só `is_teacher()`); ainda sem tela no Painel.
- Quem religa o aviso do dia em Configurações > Notificações volta ao diário (o diário vence o semanal).
- Migration `149_cards_digest_weekly_reasons` (Staging 2026-11-26; produção pendente). Voltar atrás: shim da função no commit da v5 (`33be805`).
- Motivos na Visão Geral do Painel de Admin (pedido da dona, 2026-11-27): bloco "E-mail de cartões novos: por que saem" (respostas, quantos estão no resumo
  semanal agora, barras por motivo com o "(N escolheram o resumo semanal)", e o texto do "Outro motivo"; nota de anonimato). Lê a função
  `cards_digest_exit_summary()` (já na produção desde a 149); sem a função ou sem resposta, o bloco some. Só a admin vê. Sem migration.
