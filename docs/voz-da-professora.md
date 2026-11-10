# Voz da professora (persona do site)

Decisões 350 e 351 (2026-11-10, `docs/i18n/curriculo/12-decisoes-apos-maquete-m1.md`). Regra curta no `CLAUDE.md`;
lembrete por pasta em `.claude/rules/voz-da-professora.md`.

## A ideia

O site se chama **Idiomas com Prof. Brune** porque é a professora quem ensina. Cada lição deve parecer uma aula com ela:
quem explica, corrige, incentiva e avisa é a **Prof. Brune**, falando com o aluno como em sala de aula. Vale para **o site
inteiro** (trilha, Revisão, Desafios, Conjugação, Ditados, avisos do sino, push, e-mails e mensagens de tela). A trilha foi
a primeira área (unidade 1 do francês, piloto); as outras áreas seguem a tabela do fim deste guia.

## Como ela fala (voz calorosa, escolhida pela dona na decisão 351)

1. **Primeira pessoa, tratando o aluno por "você"**: "Vou te ensinar...", "Vou separar em dois grupos para ficar fácil",
   "eu não recomendo *mademoiselle*", "Eu, por exemplo, digo *désolée*".
2. **Calorosa e encorajadora, sem exagero**: abre a lição com boas-vindas ("Que bom ter você aqui!", "Vamos começar?"),
   comemora no fim ("Parabéns! Você já sabe cumprimentar em francês."), acolhe o erro ("Não se preocupe, esse erro é muito
   comum no começo!", "Você escreveu como se ouve, e isso é um ótimo sinal!"). Sem emoji, sem "Uau", sem pontos de exclamação
   em toda frase.
3. **Jeito de sala de aula**: "Repare", "Olhe a grafia", "Não confunda", "Cuidado com a tradução ao pé da letra", e retoma o
   que já foi visto ("Lembra do *salut* lá da primeira lição?").
4. **"Em francês..." / "os franceses..."**, nunca "usamos" ou "nós dizemos" (a professora é brasileira; "nós" fica ambíguo).
   "O nosso tchau" = o equivalente brasileiro, e pode.
5. **Explicação do painel serve para o acerto e para o erro**: não começa com "Isso!" nem com "Errou". O incentivo do erro vai
   no texto específico daquele erro (`explicacao_erro`), e o título do painel diz o resto: **"Isso mesmo!"** ou **"Quase lá!"**.
6. **Nada de vivência inventada**: lembranças, histórias, "meus alunos sempre perguntam isso", "quando eu morava na França" só
   entram escritas ou aprovadas pela dona. Pode: o que vale para qualquer professora ("essa dúvida aparece muito no começo") e
   o que é verdade sobre ela por ser mulher ("eu digo *désolée*").
7. **Português do Brasil coloquial** (regra do `CLAUDE.md`): sem "pra", sem "--", sem travessão. Neutro em gênero com o aluno
   ("falar com educação", não "ser educado"; "Que bom ter você aqui!", não "Bem-vinda").
8. **No site em inglês**, a mesma professora fala em inglês (nada em português); os textos são escritos para cada idioma do
   site, não traduzidos às cegas (`.claude/rules/i18n.md`).
9. **Termos**: continua **"lição"**, não "aula" (o site já tem "Minhas aulas" para as aulas de verdade com a professora).

## Onde ela aparece na tela

- **Foto e nome** ("Prof. Brune") onde ela fala com o aluno: abertura da lição, notas ("Prof. Brune explica"), painel da
  resposta e tela final. Foto: `icons/brune-email.jpg` (a mesma dos e-mails). É a única imagem dentro da lição por enquanto
  (decisão 341: só imagem de verdade).
- Frases de exemplo em 1ª pessoa são ditas por ela: tradução no feminino (*obrigada*), e a voz do áudio da trilha é feminina
  (Chirp 3 HD Achernar). Nos diálogos falam os personagens (voz masculina para eles).

## Exemplo antes e depois (painel de erro, lição 1, restaurante às 20h, aluno marcou *Salut !*)

- Antes: "*Salut* é só para amigos e pessoas próximas, e o garçom você não conhece. À noite, ao chegar num lugar, dizemos *bonsoir*."
- Depois: "Não se preocupe, esse erro é muito comum no começo! O garçom você não conhece. À noite, quando você chega num lugar,
  troque o *bonjour* pelo *bonsoir*. E o *salut*, a gente guarda para os amigos."

Referência completa: `docs/i18n/curriculo/piloto-m1/A1-1/A1-1.json` (notas, `telas[].explicacao`, `explicacao_erro`, `objetivo`,
`fala` da tela final) e a maquete `docs/i18n/curriculo/maquete-licao-curta/` (`node .../gerar.js --antes=d9d5725` mostra o texto neutro ao lado).

## Áreas e situação

| Área | Onde ficam os textos | Situação |
|---|---|---|
| Trilha (lições, notas, painéis) | rascunhos `docs/i18n/curriculo/piloto-m1/<unidade>/`; publicado em `fr/content.js`, `courses/**`, `zh/content.js` | Unidade 1 do francês feita no rascunho; as outras unidades, ao redesenhar cada uma no formato da lição curta |
| Microtextos da interface (títulos do painel, fim de lição, toasts) | `shared/i18n/pt-BR.js` e `en.js` (ex.: `review.almost`, `feedback.almostArrow`, `dlgCheck.almost`, `fr.conj.wellDone`) | Pendente (português não muda sem aprovação: `tests/i18n`, `DELIBERATE_PT_CHANGES`) |
| Revisão (flashcards) | `shared/i18n/*.js` (chaves `review.*`), `shared/srs.js` | Pendente |
| Desafios e Ditados | `fr/challenges.js`, `fr/scripts/challenges_import/**`, `fr/dictations.js` | Pendente |
| Conjugação | `fr/conjugation-data.js`, `fr/conj-games.js`, chaves `fr.conj.*` | Pendente |
| Avisos do sino e push | tabela `notification_templates` (migrations em `shared/supabase_migrations/`, ex.: 056, 106, 108), `supabase/functions/notification-cron`, `push-dispatch`, `push-send`; texto no idioma de quem recebe (`_ui_lang`) | Pendente (mudar dado em produção só com autorização; Edge Function só muda após deploy) |
| E-mails | `docs/email/**`, `supabase/functions/report-reply-send` | Assinatura e foto já existem; texto na voz dela pendente |
| Mandarim e português | `zh/`, curso `pt` | Pendente, junto com o redesenho de cada curso |

Ao terminar uma área, atualize a linha da tabela e a linha do "Estado atual" do `CLAUDE.md`.
