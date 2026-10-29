# Trecho para a política de privacidade: dados de uso e de desempenho nos estudos (RASCUNHO, pedido da dona, 2026-10-29)

Situação: **não achei a política de privacidade no repositório** (procurei em todos os arquivos de página e de código). Ela deve estar fora dele (outro domínio, Notion, Google Sites, Apps Script). Este trecho está pronto para ser colado onde ela mora.
**Rascunho: precisa de revisão jurídica antes de publicar** (não é aconselhamento jurídico; confiança média).

## Português do Brasil
**Dados de uso e de desempenho nos estudos.** Quando você estuda, registramos eventos de uso do site, como lições e exercícios concluídos, cartões revisados, acertos e erros, notas obtidas, os horários em que essas ações acontecem (o que nos permite calcular quanto tempo cada atividade costuma levar), o tipo de aparelho, o navegador e o sistema, e erros técnicos que aparecem durante o uso.
Usamos esses dados para (i) mostrar seu progresso, sua sequência de estudos e suas conquistas, (ii) melhorar o conteúdo, a ordem e a dificuldade das lições, (iii) calcular estatísticas **agregadas e sem identificar você** sobre como o site é usado, e (iv) encontrar e corrigir problemas técnicos. Quando sua professora acompanha seus estudos, ela vê o seu progresso e o seu desempenho no painel dela.
Guardamos esses dados enquanto sua conta existir e para estatísticas agregadas depois disso, sem identificação. Você pode pedir acesso, correção ou exclusão dos seus dados, e pode excluir sua conta a qualquer momento.

## English
**Usage and study-performance data.** When you study, we record usage events such as lessons and exercises completed, cards reviewed, right and wrong answers, scores, the times at which these actions happen (which lets us work out how long each activity usually takes), device type, browser and operating system, and technical errors that occur while you use the site.
We use this data to (i) show your progress, study streak and achievements, (ii) improve the content, the order and the difficulty of the lessons, (iii) produce **aggregated statistics that do not identify you** about how the site is used, and (iv) find and fix technical problems. When your teacher follows your studies, they see your progress and performance in their dashboard.
We keep this data while your account exists, and keep aggregated, non-identifying statistics afterwards. You may ask for access to, correction of or deletion of your data, and you may delete your account at any time.

## Antes de publicar
- Conferir se é verdade o que o trecho afirma (campos gravados em `usage_events`: `event_type`, `event_name`, `meta`, `created_at`, `session_id`, `device_type`, `browser`, `os`; retenção real; exclusão de conta apaga os eventos?).
- O `meta` dos eventos não deve conter dado pessoal (conferir).
- Novos eventos de duração (início da lição, duração ativa, tempo por fase, abandono) só entram **depois** de o texto estar publicado.
