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
