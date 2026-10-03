# Ferramentas de tradução para o app (DeepL x Claude x Reverso Context)

Teste feito em 2026-10-03 com trechos reais da unidade A1-1 (francês).

## Resultado resumido

| Ferramenta | Pontos fortes | Limites encontrados | Papel recomendado |
|---|---|---|---|
| **Claude** | Entende o contexto pedagógico (registro formal/informal, "tu/vous", notas de realidade e culturais); dá variações e explica a escolha; respeita as regras do `CLAUDE.md` | Pode ser confiante demais sozinho; precisa de uma segunda opinião independente | Tradutor principal e autor das variações |
| **DeepL (plano Free)** | Rápido, preserva tags HTML (`<strong>`), bom em frases completas | **Plano Free: não aceita `context`, glossário, estilo nem instruções** (dá erro). Itens curtos e isolados perdem nuance. Traduzir a partir do português (a glosa) em vez do francês gera deriva (ver abaixo). Maiúsculas inconsistentes ("Thank you", "All right") | Segunda opinião independente, para medir concordância |
| **Reverso Context** | Mostra a tradução com frases reais e a frequência de cada tradução; muito útil para o ser humano decidir | Não encontrei API oficial pública (não verifiquei no site). Os termos de uso provavelmente restringem acesso automatizado; é preciso conferi-los antes de qualquer uso desse tipo. Não foi acessado nesta noite | Conferência **manual** dos itens de confiança média/baixa, por link |

## O que o teste mostrou

Amostra: 12 itens (vocabulário, frase, título, trecho de explicação em HTML), para EN-US e ES.

1. **Traduzir a partir do português (pivot) distorce itens idiomáticos.** A glosa "tudo bem" (resposta a "ça va") virou **"All right"** em inglês e **"No pasa nada"** em espanhol. Direto do francês, "ça va" virou "I'm fine" e "¿Qué tal?", bem melhores.
2. **Partindo do francês perdem-se as glosas múltiplas e as notas entre parênteses** ("olá / bom dia", "(formal)"). Por isso o método recomendado usa o francês como fonte do sentido e o português só como pista.
3. **Nuance de registro desaparece em itens isolados.** "obrigado(a)" virou "Thank you" (aceitável), mas "salut" virou "Hi" sem marca de informalidade.
4. **Tags HTML foram preservadas** nas explicações; o travessão "—" foi trocado por um traço sem espaços (detalhe de estilo).
5. **ES:** "au revoir" virou "adiós", que em espanhol soa mais definitivo que "au revoir"; "hasta luego/hasta pronto" costuma servir melhor. Exemplo de variação que precisa de revisão humana.

## Método adotado (duas máquinas independentes + critério de confiança)

1. O Claude traduz a partir do **francês**, usando o português só como pista do sentido pretendido. Títulos, explicações e perguntas verdadeiro/falso partem do português.
2. O DeepL traduz o mesmo item de forma independente.
3. Comparação:
   - **ALTA**: as duas concordam em sentido e registro, item simples e inequívoco.
   - **MÉDIA**: concordam no sentido, mas divergem em registro ou forma, ou há mais de uma tradução igualmente correta.
   - **BAIXA**: divergem no sentido, item idiomático/coloquial/cultural, ou o registro pode se perder.
4. Todo item MÉDIA/BAIXA ganha **2 a 3 variações** (EN-US/EN-GB, ES América Latina/Espanha, tuteo/ustedeo) e um **link do Reverso Context** para conferência manual.
5. Nada vai ao ar sem aprovação: tudo entra com `status: needs_review`.

## Pendências de decisão (sua)

- **DeepL Pro** (pago) liberaria glossário e contexto, o que melhoraria itens como "tudo bem". Não foi contratado; só vale a pena se o volume crescer.
- **Reverso**: se você quiser automatizar, é preciso antes confirmar os termos de uso do site. Até lá, só links para conferência manual.
