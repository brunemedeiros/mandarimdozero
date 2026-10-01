# Public Deck — Duplicatas / Reimportação: contrato (SÓ especificação)

Estado de partida: hardening aprovado, commit `66751fd` (P7 `377950c`). Nada aqui está implementado, nenhuma
migration aplicada, sem push/PR/deploy. Fontes: `docs/arquitetura-total-decks-tags-painel.md` (AT §19.1, §23, §24,
inv. 28), `docs/public-decks-contrato-tecnico.md` §11–13, código atual lido nesta auditoria.
Itens marcados **DECISÃO NECESSÁRIA** não são determináveis pela arquitetura e NÃO foram resolvidos.

## 0. Achados da auditoria (fatos do código)
1. **Não existe identidade de conteúdo.** Ids são de *linha/instância*: `own_flashcards.id` (+`revision` ⇒ id
   sintético `s<id>[-r<rev>]`, sufixo `-b` no reverso, `-cN` no Cloze); trilha = `u<unit>-v<idx>` (sem Note).
   Nenhum deles serve para equivalência (mudam com edição/cópia, dependem de direção/ordem).
2. **`front`/`back_trans` são espelho legado decorativo e com perda**: Cloze grava `front=null`; MC só
   prompt/resposta (distratores se perdem); Normal e Normal‑reverso geram o mesmo par; Type Answer idem.
   **Não podem ser a chave de duplicata.**
3. **A única "dedup" existente (Anki import, `shared/anki-import.js` `normalizeForDedup`) usa exatamente esse
   espelho** ⇒ falsos negativos (Cloze sem front) e falsos positivos (Normal vs Reverso vs Type Answer). Isso é
   uma 1ª implementação defeituosa; **a fase não deve criar uma 2ª** (ver §D).
4. A fonte de verdade comparável é a **forma nativa**: `fields`+`card_generation_mode` para Notes nativas e
   `public_note_native(r)` (SQL, paridade 17/17 com `nativeNoteEditorStateFromLegacyRow`) para Legacy. Devolve
   `NULL` quando o Legacy não é mapeável com segurança ⇒ "não comparável".
5. `copy_public_deck` hoje **não detecta nada** e **não verifica nome de Deck repetido**: sempre cria um Deck novo
   com o mesmo nome (AT §23 manda perguntar: sufixo `(2)` ou inserir no existente). Também não conta
   CardInstances (Premium não tem teto de 20).
6. Não há vínculo vivo nem `source_*` (decisão fechada). Após cópia, a Note é conteúdo próprio do importador;
   reconhecer "veio daquele Deck" só é possível **por conteúdo corrente**, nunca por origem.
7. Editar conteúdo (inclusive Tags no editor) incrementa `revision` e reinicia a geração. O Painel de Tags
   (057) altera só `tags`, sem `revision`.

## A. Modelo de identidade de conteúdo
- **Unidade comparada = a Note** (nunca a CardInstance). Reverso e Cloze multi‑marca são uma Note ⇒ uma
  comparação. FSRS/`revision`/ids/Deck/Tags/mídia/`note` privada **não** entram na identidade.
- **Assinatura canônica** (`content_signature`), calculada *somente em SQL* sobre `public_note_native(r)`:
  `hash( language_app_key , família , componentes normalizados )`.
  - Normalização (v1, conservadora): NFC, `trim`, espaços colapsados, case‑fold. **Acentos e pontuação
    preservados** (em francês, `a`≠`à`). Texto puro (Fields não têm rich text).
  - Posição importa (slot 0 = frente/prompt/texto, slot 1 = verso/resposta/tradução, via `contentFieldIndices`);
    pinyin satélite (`pinyinFieldId`) entra junto do Field dono; `lang`, `role` fora de MC, ids de Field, áudio,
    imagem, `storagePath`, `generationKey` **não** entram.
  - Famílias: `pair` = {Normal, Normal‑reverso, Type Answer} (2 slots), `cloze`, `mc`. A assinatura exata inclui o
    `card_generation_mode`; a **chave de variante** (§B) usa só a "face de pergunta".
- **Independe** de: autor, Deck/Note/Instance de origem, `display_name`, despublicação, exclusão, mídia original,
  edições posteriores de Tags/Deck/mídia do importador.
- **Escopo da busca** = coleção do copiador: `own_flashcards` do mesmo `language_app_key`, em qualquer Deck
  pessoal (inclusive `deck_id` nulo); **ativas e arquivadas** (arquivada é informada como tal).

## B. Definição de equivalência
- **EXACT**: mesma assinatura completa (mesma família, modo e conteúdo normalizado).
- **VARIANT**: mesma família e mesma *chave de variante*, mas assinatura diferente. Chave: pair ⇒ texto do slot 0
  (+pinyin); cloze ⇒ frase com marcas removidas (texto revelado); mc ⇒ prompt. Igualdade estrutural, **sem
  distância de edição, sem similaridade difusa**.
- **Cross‑family** (mesmo par {slot0,slot1} em Normal×Reverso×Type Answer): **VARIANT** rotulado "mesmo conteúdo,
  outro tipo de cartão". Nunca EXACT, nunca merge.
- Fora disso: **NONE** (coexistem sem aviso).

## C. Matriz A–L
| # | Caso | Classe | Comportamento |
|---|---|---|---|
| A | Note exatamente equivalente | EXACT | duplicata → padrão **pular** |
| B | Equivalente, Tags diferentes | EXACT | duplicata; Tags não participam; local **não é tocado** |
| C | Equivalente, outro Deck | EXACT | duplicata (informa em qual Deck está); padrão pular; pode "criar mesmo assim" |
| D | Equivalente, outro Card Type | VARIANT (cross‑family) | só informa; coexiste; sem merge |
| E | Mesma frente, verso diferente | VARIANT | informa; escolha por Note: manter a minha / adicionar a do Deck |
| F | Mesmos Fields, conteúdo diferente | NONE (ou VARIANT se a face de pergunta bate) | coexiste |
| G | Normal × Normal‑reverso | VARIANT (cross‑family) | **não** são duplicatas (gerações diferentes); coexistem; reverso não vira "2 duplicatas" |
| H | Cloze | EXACT/VARIANT só dentro de `cloze` | mesma frase+marcas = EXACT; mesma frase, marcas diferentes = VARIANT; nunca comparado com Normal |
| I | Multiple Choice | idem, dentro de `mc` | prompt+resposta+conjunto de distratores (sem ordem) = EXACT; mesmo prompt, resto diferente = VARIANT |
| J | Type Answer | família `pair` | prompt+resposta(+pinyin) = EXACT só contra Type Answer |
| K | Teacher / Study Trail / Course | **não comparados** | Teacher vive em outra tabela e sob controle da professora; trilha não tem Note; coexistem |
| L | Legacy × Native | pela forma nativa | compara via `public_note_native`; Legacy incompatível ⇒ não comparável |

## D. Implementação única (anti‑paralelismo)
Uma só função SQL `note_content_signature(own_flashcards)` + `note_variant_key(...)`. O JS **nunca** calcula
assinatura. Fontes sem linha ainda no banco (Notes do Public Deck, Notes de um `.apkg`) passam por uma RPC que
recebe a forma nativa em jsonb e devolve assinaturas/candidatas. Substituir o `normalizeForDedup` do Anki por essa
RPC é dívida técnica a registrar (**DECISÃO NECESSÁRIA**: entra nesta fase ou numa fase própria?).

## E. Tags / attribution
- `criado-por-[username]` **não é chave** de dedup (nem entra na assinatura).
- **Pular (EXACT)**: nada é gravado no local — nem Tags, nem atribuição (alterar Tags no editor reiniciaria
  `revision`; alterar sem `revision` seria contornar a regra). A Note local preserva exatamente suas Tags.
- **Criar mesmo assim / adicionar variante**: fluxo atual inalterado (`note_attribution_tag` + `note_copy_tags`;
  cópia de cópia mantém só a atribuição original; limite 19+1).
- **Multi‑autor**: o modelo atual representa **uma** atribuição por Note. Representar vários autores exigiria
  mudar `note_attribution_tag`/limites — **não alterado** e não necessário se a v1 nunca funde Tags.
  **DECISÃO NECESSÁRIA**: ao pular um EXACT *sem* atribuição (Note criada pelo próprio usuário), informar apenas,
  ou oferecer "adicionar a atribuição do autor"? (exigiria editar Tags ⇒ `revision`).

## F. Deck
- **Nome repetido** (AT §23): ao importar, se já existe Deck de mesmo nome (case‑fold) no destino, perguntar:
  *criar com sufixo `(2)`* ou *inserir no Deck existente*. Subdecks: casam por nome sob o Deck casado; sem par,
  criam‑se. Reconhecimento de "mesmo Deck" é **só por nome+pai** (não há `source_*`).
- Detecção de Notes é na **coleção inteira** (C); a inserção respeita a escolha de Deck. Mover Note move
  irmãos (inalterado). Destino só `personal_root`/`personal` (inalterado). Nunca grava em Course/Teacher.
- Importação parcial (escolher Notes) **não existe hoje**; "pular duplicatas" produz importação parcial como
  efeito, sem seleção manual. **DECISÃO NECESSÁRIA**: oferecer seleção manual por Note ou só pular/criar?

## G. FSRS / merge
- **v1 não altera nenhuma Note existente.** Logo: nenhum reset, nenhum `revision++`, nenhum FSRS tocado; a regra
  "editar reinicia a geração" não é contornada porque não há edição. Instâncias irmãs seguem independentes.
- "Merge" na v1 = **inserir só o que falta**: EXACT pulados, VARIANT decididos individualmente, NONE criados.
  Merge *de campos* (união de distratores, trocar verso, converter Card Type) **fica fora**: alteraria conteúdo
  (⇒ `revision`) e é irreversível para o FSRS. **DECISÃO NECESSÁRIA**: a v1 é "inserir o que falta" ou inclui
  merge de campos com reset explícito e confirmação?

## H. Mídia
- Mídia nunca participa da identidade. EXACT pulada ⇒ **nenhuma mídia é copiada** (o manifest passa a excluir as
  Notes puladas; ordem do fluxo: *checar → decidir → manifest filtrado → `storage.copy` → RPC*).
- VARIANT/NONE criadas: P7 inalterado (cópia física, mapa validado). Mídia local nunca é substituída; externa
  continua externa. Sem dedup de arquivos no Storage (ownership por pasta de usuário permanece).

## I. Limite
- Pular não consome. Criar consome `generatedCardInstanceCount` por Note (Reverso=2, Cloze=N). Premium continua
  sem o teto de 20 (hoje a RPC não conta; a contagem só importaria se Free pudesse importar — não pode). Guard
  técnico 2000 Notes/mídias continua separado; **DECISÃO NECESSÁRIA** menor: contar a árvore de origem (atual,
  conservador) ou só as Notes a criar?
- Atomicidade: uma RPC, uma transação; falha ⇒ nada criado; compensação de mídia como no P7.

## J. Concorrência
- Não se usa índice único (duplicatas intencionais são legais). Serialização por `pg_advisory_xact_lock` do
  copiador no início da RPC; a decisão é **recalculada sob o lock** por assinatura (nunca por posição).
- Protocolo: `check_public_deck_duplicates` (read‑only) → decisões `{assinatura: 'skip'|'create'}` → RPC cria.
  Se, sob o lock, surgir EXACT sem decisão ⇒ erro `duplicates_changed` (nada criado), como `media_map_incomplete`.
- Resultado: dois cliques/duas abas ⇒ o 1º cria; o 2º recebe candidatas e precisa decidir. Edição concorrente da
  Note local na janela entre check e commit: pior caso = 1 duplicata extra ou 1 pulo por assinatura velha
  (inofensivo, nunca perde dado).

## K. Riscos
1. Normalização conservadora gera falsos negativos (acento/pontuação) — preferível a falsos positivos.
2. Sem `source_*`, Note editada deixa de ser reconhecível como "a mesma" — consequência assumida da cópia
   independente; a VARIANT mitiga.
3. Divergência SQL×JS se alguém reimplementar a assinatura (mitigado por §D e teste de paridade).
4. Dívida: Anki import continua com dedup defeituosa até ser migrado.
5. Performance: assinatura da coleção do usuário calculada por requisição (O(N+M) por hash join); medir antes de
   considerar coluna armazenada.
6. UX de decisão em Deck grande (500+ Notes): precisa de decisão em lote (padrão por classe).

## L. Testes propostos
SQL (Postgres local): assinatura estável/determinística; EXACT/VARIANT/cross‑family/NONE para cada A–L; Legacy×
Native×incompatível; irmãos (reverso=1 Note, Cloze 3 marcas=1); Tags/Deck/mídia não alteram a classe; pular não
cria nem toca nada (hash da Note local idêntico, `revision` igual); reimportação do mesmo Deck ⇒ tudo EXACT, 0
criadas; após editar local ⇒ VARIANT, 0 sobrescritas; após autor despublicar/excluir/trocar `display_name` a
detecção continua; Course/Teacher/trilha não comparados; destino inválido; limite 2000 e contagem de
CardInstances; concorrência (2 sessões simultâneas ⇒ 1 cria, 1 `duplicates_changed`/decide); manifest filtrado
(sem mídia das puladas). Cliente (Playwright fr+zh): fluxo check→decidir→manifest→copy→RPC, erro ambíguo mantém
mídia (P7), reentrância. Paridade: o JS não contém normalização própria.

## M. Arquivos que mudariam
`shared/supabase_migrations/062_public_deck_duplicates.sql` (novo); `shared/public-deck.js` (fluxo em fases + UI
mínima de decisão); `tests/fase-public-deck/*` (SQL + Playwright); este doc e o contrato técnico. Condicional:
`shared/anki-import.js` (migrar dedup, se aprovado). **Não** tocam FSRS, Review, Study Trail, Identity, attribution.

## N. Migrations
Uma (062, **só funções**, sem tabela/coluna/backfill): `note_content_signature`, `note_variant_key`,
`check_public_deck_duplicates(p_public_id, p_dest_deck_id)`, extensão compatível de
`copy_public_deck(..., p_decisions jsonb default null)` e do manifest (`p_skip_signatures text[] default null`).
Coluna `content_key` armazenada + índice **não** é proposta (só se a medição exigir; exigiria backfill).
**Não aplicar sem aprovação.**

## O. Decisões de produto pendentes
1. Normalização v1 (NFC+trim+espaços+case‑fold, acentos/pontuação preservados) está aceita?
2. Padrão para EXACT: **pular** (proposto) — e "criar mesmo assim" disponível?
3. Arquivadas entram na detecção (proposto: sim, sinalizadas)?
4. v1 = "inserir o que falta" (proposto) ou inclui merge de campos com reset?
5. Atribuição ao pular EXACT de Note própria sem `criado-por`: só informar (proposto) ou oferecer adicionar?
6. Nome de Deck repetido: confirmar o fluxo de AT §23 (sufixo `(2)` / inserir no existente) como parte desta fase.
7. Importação parcial manual por Note: sim/não.
8. Migrar o dedup do Anki para a mesma RPC agora ou depois.
9. Guard 2000: contar árvore de origem (atual) ou só as Notes a criar.
10. VARIANT: confirmar a regra de "chave de variante" (§B) e o rótulo cross‑family para Normal×Reverso×Type Answer.
