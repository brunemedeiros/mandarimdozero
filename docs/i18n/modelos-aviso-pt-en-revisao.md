# Modelos de aviso do português em inglês: rascunho para revisão

Rascunho de 2026-10-15. Nada foi aplicado em banco nenhum. Migration: `shared/supabase_migrations/105_pt_notification_templates_en_draft.sql`
(só INSERT, 21 linhas, **todas inativas**: `active = false`). Teste local: `tests/avisos-idioma/test_105.sql` (rodado por `tests/avisos-idioma/run.sh`).
Contexto: `docs/i18n/e6-minimo-servidor-pt.md` (achado Q4, perguntas P2 e P3). O curso de português é só em inglês (Q-04), então tudo é `ui_language = 'en'` e `language_app_key = 'portugues'`.

**O que é grátis e o que é Premium:** tudo grátis (avisos de sequência, meta e reengajamento nunca foram Premium).

## O que você precisa fazer

1. **Revisar os textos da tabela abaixo.** Para trocar um texto, edite este arquivo (ou me diga) e eu gero a migration de novo; depois de aplicada, também dá para editar pelo Painel de Admin > Notificações.
2. **Aplicar a migration 105** (Staging e depois produção, ferramenta de migration; não tem DROP nem DELETE). Ela só cria as linhas inativas, nada muda para ninguém.
3. **Ativar** só depois de aprovar os textos *e* de a `notification-cron` ser publicada com `portugues` (achado Q1, ainda pendente: sem isso as linhas ficam paradas mesmo ativas). Comando, no SQL Editor (Staging antes):

```sql
update public.notification_templates set active = true
 where language_app_key = 'portugues' and ui_language = 'en' and created_by = 'i18n-pt-en-rascunho';
```

   Para ativar só um tipo de aviso, acrescente `and event_type = 'streak_at_risk'` (por exemplo).
4. **Desfazer:** remover as linhas com `created_by = 'i18n-pt-en-rascunho'`.

## Como foram escritos

- Mesmo formato das linhas que já existem: `streak_at_risk` e `study_goal_remaining` só no sino, com título e ícone (seed 012);
  reengajamento no sino sem título, dias 1, 3, 5, 7, 9 (2 variantes) e 15, 20, 30 (1) (seed 010);
  reengajamento por e-mail só nos dias 9, 15, 20 e 30, com assunto e mensagem (seed 015). Projeto não tem e-mail de
  sequência nem de meta hoje (regra `supabase.md`: só a faixa de reengajamento tem e-mail), então não criei.
- Texto na linha de `docs/i18n/notif-en.json` (os do francês, trocando "French" por "Portuguese"). Mudanças
  deliberadas: sem "--" (regra do projeto; troquei por vírgula ou ponto); `{{days}}-day streak` com hífen, para o singular
  não sair "1 days"; `Lessons left...: {{lessonsRemaining}}` para não sair "1 lessons".
- Sem nenhuma palavra em português (nem "obrigado"), conforme a regra "site em inglês não tem nada em português".
- Variáveis: só `{{days}}` e `{{lessonsRemaining}}`, as que o cron preenche hoje.
- Não incluí ainda: revisão atrasada (`review_overdue`), XP, conquista, missões, ranking semanal e o alerta de aluno sumido
  para a professora (este depende da P1). Ficam para o próximo lote depois que você aprovar o tom deste.

## Tabela para revisão

Canal: **Sino** = aviso dentro do app (`in_app`); **E-mail** = Resend (assunto = título, mensagem = texto).
Confiança: nível da tradução/tom em inglês (alta, média ou baixa).

| # | Evento | Canal | Título (assunto no e-mail) | Texto | Quando dispara | Confiança |
|---|---|---|---|---|---|---|
| 1 | `streak_at_risk` | Sino | 🔥 Your streak is at risk! | You haven't studied today yet. Your {{days}}-day streak is waiting for 5 little minutes from you. | Tem sequência a perder e ainda não estudou hoje | alta |
| 2 | `streak_at_risk` | Sino | Don't let it go out! | Only today is missing to keep your {{days}}-day streak going. There's still time! | Mesmo gatilho (variante sorteada) | alta |
| 3 | `study_goal_remaining` | Sino | Almost at today's goal | Lessons left to hit your daily goal: {{lessonsRemaining}}. You've got this! | Hoje é dia de meta e ela ainda não foi batida | alta (escrito sem 'lessons' logo depois do número, para não sair '1 lessons') |
| 4 | `study_goal_remaining` | Sino | Almost there! | You've already done part of today's goal. Lessons left: {{lessonsRemaining}}. | Mesmo gatilho (variante sorteada) | alta |
| 5 | `user_inactive_1` | Sino | (sem título) | Hey, did you forget about me? 🥺 Just five little minutes and your daily Portuguese is done. | Sumiu há 1 dia | alta |
| 6 | `user_inactive_1` | Sino | (sem título) | Your Portuguese is right here, waiting for you (with puppy-dog eyes) 🐶 | Sumiu há 1 dia (variante sorteada) | média |
| 7 | `user_inactive_3` | Sino | (sem título) | 3 days without showing up... I already miss you! Come say a quick hi? 👋 | Sumiu há 3 dias | alta |
| 8 | `user_inactive_3` | Sino | (sem título) | Psst. Your Portuguese is getting lonely. | Sumiu há 3 dias (variante sorteada) | média |
| 9 | `user_inactive_5` | Sino | (sem título) | Where are you? Your Portuguese is still here, on the same page you left it 📖 | Sumiu há 5 dias | alta |
| 10 | `user_inactive_5` | Sino | (sem título) | 5 days! How about just one quick exercise to keep the rhythm? | Sumiu há 5 dias (variante sorteada) | alta |
| 11 | `user_inactive_7` | Sino | (sem título) | A whole week... is everything okay over there? Come on, we'll pick it back up together 🫶 | Sumiu há 7 dias | alta |
| 12 | `user_inactive_7` | Sino | (sem título) | Your streak is sleeping. How about waking it up with 5 little minutes? | Sumiu há 7 dias (variante sorteada) | alta |
| 13 | `user_inactive_9` | Sino | (sem título) | It's been a little while! No rush, just reminding you that your progress is waiting 🙂 | Sumiu há 9 dias | alta |
| 14 | `user_inactive_9` | Sino | (sem título) | Want to pick up where you left off? We'll help you remember quickly. | Sumiu há 9 dias (variante sorteada) | alta |
| 15 | `user_inactive_15` | Sino | (sem título) | No rush at all, but if you feel like it, your progress is waiting for you here. | Sumiu há 15 dias | alta |
| 16 | `user_inactive_20` | Sino | (sem título) | Your Portuguese is still safely stored, just the way you left it. Come back whenever you like 🙂 | Sumiu há 20 dias | alta |
| 17 | `user_inactive_30` | Sino | (sem título) | Your progress is still safely stored here, just the way you left it. | Sumiu há 30 dias | alta |
| 18 | `user_inactive_9` | E-mail | We miss you in Portuguese 👋 | It's been 9 days since you studied here. No rush at all. Your progress is still saved, exactly as you left it. Whenever you want, just come back. | Sumiu há 9 dias (assunto + mensagem do e-mail) | alta |
| 19 | `user_inactive_15` | E-mail | Your Portuguese is waiting for you | 15 days away, and that's okay, life happens. Just a reminder that your progress is safely stored here, ready for whenever you want to pick it back up. | Sumiu há 15 dias (assunto + mensagem do e-mail) | alta |
| 20 | `user_inactive_20` | E-mail | Still there? Your Portuguese is waiting | 20 days already! No pressure at all, just stopping by to remind you that you can pick up right where you left off, at your own pace. | Sumiu há 20 dias (assunto + mensagem do e-mail) | alta |
| 21 | `user_inactive_30` | E-mail | A month without Portuguese. Everything okay? | It's been a month since you last stopped by. Your progress is still saved, just the way you left it. Whenever you feel like coming back, we're here. | Sumiu há 30 dias (assunto + mensagem do e-mail) | alta |

## Pontos de atenção para a revisão (os de confiança média)

- **Linha 6** ("with puppy-dog eyes" 🐶): a piada do cachorrinho vem do francês; em inglês funciona, mas é bem informal. Se preferir mais sóbrio: "Your Portuguese is right here, waiting for you 🐶".
- **Linha 8** ("Psst. Your Portuguese is getting lonely."): no francês é "está com saudade de ser praticado"; "getting lonely" é mais natural em inglês, mas muda um pouco a imagem.
- Nas variantes de "dias sem estudar" os textos dizem "3 days" e "5 days" fixos no corpo: isso é igual ao que já existe no francês (cada texto é do dia que dispara).
- "Portuguese" sem "Brazilian": o curso é de português do Brasil. Se quiser deixar claro, trocar para "Brazilian Portuguese" nos títulos de e-mail.
