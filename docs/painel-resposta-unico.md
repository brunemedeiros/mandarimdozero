# Painel de resposta único do site (contrato)

Decisão da autora (2026-11-11): **uma só tela de resposta, certa ou errada, para a trilha, as Expressões, os Jogos e todas
as outras telas de exercício** (Revisão, Desafios, Ditados, Conjugação, Banco...), no estilo da maquete da lição curta
(`docs/i18n/curriculo/maquete-licao-curta/`, branch `claude/confident-brahmagupta-8v7rg0`) e na voz da professora
(`docs/voz-da-professora.md`, decisões 350 a 352). Vale para todos os sites (fr, zh, pt e futuros).

## Como é

```
┌ painel verde (acerto) ou vermelho (erro) ─────────┐
│ (✓) Isso mesmo!   /   (✕) Quase lá!              │  título (✓/✕ pelo CSS)
│ Je suis fatigué après le travail.           [🔊] │  frase CERTA, em negrito
│ Estou cansado depois do trabalho.                │  tradução no idioma do site
│ [extra: no "quase", o desenho letra a letra]     │  opcional
│ (foto) Prof. Brune                               │
│        regra em negrito (opcional)               │  a fala é da professora
│        explicação na voz dela                    │
│ [ Continuar → ] verde ou vermelho, largura toda  │
└───────────────────────────────────────────────────┘
```

- Títulos: "Isso mesmo!" (acerto), "Quase lá!" (erro), "Quase certo!" (erro só de acento ou de uma letra, que conta como
  acerto e fica verde), "Resposta revelada" ("Não sei"). en: "That's right!", "Almost there!", "Almost right!".
- Não repete o que a tela já mostra: a opção marcada já fica vermelha nos botões; o que a aluna digitou já fica no campo.
  Só o "quase" mostra o que ela escreveu (o desenho letra a letra ensina a letra que faltou).
- Foto: `icons/brune-email.jpg`; nome "Prof. Brune" (`answerPanel.teacher`).

## Código

- `shared/core/painel-resposta.js`: `painelRespostaHTML({ estado, frase, traducao, lang, ouvir, extra, regra, explicacao,
  continuar, idContinuar })` devolve o HTML; quem chama liga o clique do botão (`idContinuar`) e o 🔊 (`[data-pr-ouvir]`).
- `shared/painel-resposta.css`: só tokens do site; carregado no `index.html` de cada site (fr e zh).
- Chaves de texto: `answerPanel.right`, `answerPanel.almost`, `answerPanel.wrong`, `answerPanel.teacher`
  (+ `feedback.header.revealed`).

## Adoção (cada área só depois da aprovação da autora, com prévia antes x depois)

| Área | Situação |
|---|---|
| Jogos da Conjugação | **Piloto, feito** (2026-11-11, branch `claude/affectionate-fermi-w2s41y`) |
| Trilha (lição) | Aprovado em 2026-11-23, fica com a conversa da lição curta (texto de passagem no chat desta sessão); a reformulação da lição curta (outra sessão) deve usar este componente |
| Expressões (Desafios) | **Feito** (aprovado em 2026-11-23): significado, Monte a frase e Sua vez; fala nova `profNote` aguarda o piloto de textos (`docs/voz-piloto-jogos-expressoes.md`) |
| Ouça e traduza, Acentuação, Complete a frase, Ditados, Revisão, Banco, Conjugação (prática) | A fazer |

Ao adotar numa área: trocar o painel antigo (`.correct-feedback` / `.wrong-feedback`) por `painelRespostaHTML`, manter os
ids dos botões, atualizar os testes da área e registrar a mudança de propósito nos testes de paridade (com data e motivo).

## Ajustes depois da prévia (2026-11-11)

O próprio componente fixa `text-align:left` (a lição centraliza a tela), traz `margin-top:16px` (sem as classes antigas o
painel encostava nas opções) e usa `--on-brand-fill` no ✕ (no escuro o `--on-vivid` é escuro). Script da prévia (fora do
repositório): Playwright que troca o painel antigo pelo `painelRespostaHTML` com o conteúdo do painel antigo.

## Fala com o idioma estudado entre {chaves} (2026-11-23)

`painelRespostaRico(texto, lang)` escapa a fala e pinta de azul (`.pr-fr`) o trecho entre {chaves}, a mesma convenção dos Jogos.
Expressões: `profNote` (pt-BR no desafio; o idioma do site no overlay `challenges.<lang>.js`, campo `profNote`). Sem a fala, a
explicação em francês (`explanation`) continua como linha de apoio e a professora não aparece.

## Relação com a conversa `claude/kind-darwin-fuwjgu` (visual da lição, decisões da autora de 2026-11-15)

Essa conversa (parada desde 2026-11-15, ainda fora da `main`) acertou o VISUAL do painel antigo da trilha (`.correct-feedback` /
`.wrong-feedback`): "Continuar" verde/vermelho fixos com texto branco e degrau no tom do próprio botão (token novo
`--error-fill`/`--on-error-fill`), o mesmo vermelho de erro no fr e no zh, rótulo do painel de erro em cinza, negrito das
explicações na cor de cada site. O painel único segue as mesmas decisões (2026-11-24): o "Continuar" usa
`var(--error-fill, var(--error-red))` e o degrau no tom do botão; quando ela for mesclada, o token passa a valer sozinho.
As duas não mexem nos mesmos arquivos, exceto 2 linhas de `fr/index.html` e `zh/index.html` (o link do CSS do painel).
