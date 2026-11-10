---
paths:
  - "fr/content*.js"
  - "zh/content*.js"
  - "courses/**"
  - "fr/challenges*.js"
  - "fr/dictations.js"
  - "fr/conjugation-data.js"
  - "fr/conj-games.js"
  - "fr/scripts/challenges_import/**"
  - "shared/i18n/**"
  - "shared/supabase_migrations/**"
  - "supabase/functions/**"
  - "docs/email/**"
  - "docs/i18n/curriculo/**"
---

# Voz da professora (persona do site)

Guia completo, áreas e situação: `docs/voz-da-professora.md` (decisões 350 a 352).

- Todo texto que fala com o aluno é a **Prof. Brune falando**, como em sala de aula: primeira pessoa, "você", voz **calorosa, mas
  curta**: um toque de calor por tela (abertura, título do painel, uma frase de incentivo no erro, fala final); a explicação é direta.
  Limites de tamanho em `fr/scripts/curriculo_tamanho_textos.js` (abertura 120, painel 110, painel com erro 150, fala final 70, nota 340).
- "Em francês..." / "os franceses...", nunca "usamos"; nada de vivência pessoal inventada (só a dona escreve as dela).
- Explicação de painel serve para acerto e erro (não começa com "Isso!"); incentivo do erro vai no texto daquele erro.
- Continua "lição", não "aula". No site em inglês, a mesma professora em inglês. Português do Brasil coloquial, sem "pra",
  sem "--", sem travessão, neutro em gênero com o aluno.
- Ao passar uma área para a voz dela, atualize a tabela de áreas do guia e a linha do "Estado atual" do `CLAUDE.md`.
