# Public Deck — Duplicatas / Reimportação: contrato (SÓ especificação)

Estado de partida: hardening aprovado, commit `66751fd` (P7 `377950c`). **Revisão 2 (decisões de produto incorporadas,
ver §P).** Nada aqui está implementado, nenhuma migration aplicada, sem push/PR/deploy. Fontes: `docs/arquitetura-total-decks-tags-painel.md` (AT §19.1, §23, §24,
inv. 28), `docs/public-decks-contrato-tecnico.md` §11–13, código atual lido nesta auditoria.
Itens marcados **DECISÃO NECESSÁRIA** continuam sem decisão (listados em §P.B).

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
- **Identidade independe do Deck**: a mesma Note em Deck A (público) e Deck B (local) é EXACT. Deck nunca entra na
  assinatura nem na decisão de equivalência.


## C. Matriz A–L (revisada)
Importação padrão: EXACT/EXACT arquivada = não importar; VARIANT = não importar (selecionável); cross‑family = não é
candidato (só seção informativa); NONE = importar.
Semântica v1: **EXACT existente → não cria outra Note; VARIANT → sem merge automático; cross‑family → só informa;
NONE → coexiste.** "Inserir o que falta" = não recriar o que já existe; **nunca** fundir Fields de Notes existentes.
Nenhuma Note local existente é alterada em nenhum caso (Fields, Card Type, mídia, Tags, attribution, Deck,
`revision`, CardInstances, FSRS).

| # | Caso | Classe | Comportamento v1 |
|---|---|---|---|
| A | Note exatamente equivalente | EXACT | **não criar**; informa "já existe"; não selecionável |
| B | Equivalente, Tags diferentes | EXACT | idem; Tags não participam; local intocada |
| C | Equivalente, **em outro Deck** | EXACT | idem; informa em qual Deck está; **não move** de B para A; a Note não entra no Deck importado |
| C2 | Equivalente **arquivada** | EXACT (arquivada) | sinalizada "existe, arquivada"; **não cria, não desarquiva**, não mexe em FSRS/Tags/Deck |
| D | Equivalente, outro Card Type | cross‑family | **só informativo** ("conteúdos relacionados"); não é candidato à importação, sem checkbox; sem merge |
| E | Mesma frente, verso diferente | VARIANT | informa; **desmarcada por padrão**, selecionável explicitamente; se criada, nunca altera a local |
| F | Mesmos Fields, conteúdo diferente | NONE (ou VARIANT se a face de pergunta bate) | coexiste |
| G | Normal × Normal‑reverso | cross‑family | só informativo, fora da seleção; não são duplicatas; reverso (2 CardInstances) = 1 Note = 1 comparação |
| H | Cloze | EXACT/VARIANT só dentro de `cloze` | mesma frase+marcas = EXACT; marcas diferentes = VARIANT; cada marca segue com CardInstance/FSRS próprios |
| I | Multiple Choice | idem, dentro de `mc` | prompt+resposta+conjunto de distratores (sem ordem) = EXACT; resto = VARIANT |
| J | Type Answer | família `pair` | EXACT só contra Type Answer |
| K | Teacher / Study Trail / Course | **não comparados** | tabela/estrutura próprias; coexistem |
| L | Legacy × Native | pela forma nativa | via `public_note_native`; Legacy incompatível ⇒ "não comparável", tratada como NONE |
| M | Tem `criado-por-*` / attribution | irrelevante | attribution não é chave; Notes criadas recebem a regra atual; existentes não são tocadas |

Consequência assumida (documentada): a árvore importada pode ficar **estruturalmente diferente** da pública, pois
Notes EXACT existentes em outros Decks do usuário não são recriadas nem movidas.
**Decks sem Note nova são omitidos** (§F).

## D. Implementação única (anti‑paralelismo)
Uma só função SQL `note_content_signature(own_flashcards)` + `note_variant_key(...)`. O JS **nunca** calcula
assinatura. Fontes sem linha no banco (Notes do Public Deck) passam por RPC que recebe/lê a forma nativa e devolve
assinaturas/candidatas.
**Anki (decisão tomada):** NÃO entra nesta fase. A assinatura nativa é a fonte arquitetural correta; o dedup atual do
Anki (`normalizeForDedup` sobre o espelho legado `front`/`back_trans`) tem limitações (§0.3) e **não será corrigido nem
duplicado aqui**. Migrar o Anki para `note_content_signature` é fase posterior própria (dívida registrada).

## E. Tags / attribution
- `criado-por-[username]` **não é chave** de dedup. Modelo inalterado: Tag permanente, sem `source_user_id`/
  `source_card_id`, uma atribuição por Note (cópia de cópia mantém a original).
- **EXACT existente (qualquer Deck, ativa ou arquivada), com ou sem `criado-por`: nada é gravado** — nem Tags, nem
  attribution, nem `revision`. A attribution representa a origem na **criação/importação** de uma Note nova, nunca uma
  operação retroativa sobre conteúdo que já existia (alterar Tags no editor reiniciaria a geração).
- Notes **criadas** (NONE/VARIANT/cross‑family selecionadas): fluxo atual (`note_attribution_tag` + `note_copy_tags`;
  limite 19+1).

## F. Deck
- **v1 tem um único modo: importar como NOVA árvore independente**, aplicando as regras de duplicata. Conflito de
  nome no destino (case‑fold) ⇒ sufixo `Nome`, `Nome (2)`, `Nome (3)`… resolvido **por nome**, nunca só por id; vale
  também para subdecks dentro da árvore nova.
- **Omissão de Decks vazios:** Deck/subdeck com ≥1 Note nova é criado; com 0 Notes novas **não é criado**, exceto se
  algum descendente tiver Note nova (então existe para preservar a hierarquia). Árvore inteira sem Notes novas ⇒ nenhum Deck.
- **Modo "adicionar a Deck existente" fica para a v1.1** (operação distinta, RPC/intenção própria). Registrado o
  motivo: casamento por nome+pai é ambíguo (nomes iguais em pais diferentes, renomeações locais, estruturas
  divergentes, Notes já espalhadas). Quando existir, não será tratado como conflito de nome.
- A detecção de duplicata é na **coleção inteira** e **nunca move** Note existente para o Deck importado.
- Destino só `personal_root`/`personal`; nunca Course/Teacher (inalterado).
- Irmãos (reverso, Cloze) ficam juntos (Deck é da Note).

## G. FSRS / merge
- v1 não altera nenhuma Note existente ⇒ sem reset, sem `revision++`, sem FSRS tocado, sem merge de histórico.
- Pular uma Note existente **não cria CardInstances**. Irmãos reverso e marcas Cloze seguem independentes.
- Merge de campos (união de distratores, trocar verso, converter Card Type) **fora da v1**. Reutilizar conteúdo
  arquivado/existente = ação explícita separada, futura.

## H. Mídia
- Mídia não participa da identidade. EXACT (ativa/arquivada, qualquer Deck) ⇒ **nenhuma mídia copiada**; o manifest
  passa a conter só as Notes que serão criadas (ordem: *analisar → decidir/selecionar → manifest filtrado →
  `storage.copy` → RPC*).
- Note nova ⇒ cópia física independente (P7 inalterado). Mídia local existente nunca é substituída; externa continua
  externa. Sem dedup físico de Storage nesta fase.

## I. Limite
- Dois limites distintos, **nunca misturados na UX**:
  - **Guardrail técnico** `public_deck_copy_max_notes()`/`_max_media()` (2000, configurável): tamanho máximo da
    árvore **de origem** que pode ser processada. Não é regra de plano.
  - **Limite Free de 20 CardInstances**: regra de produto (Free não importa Public Deck; Premium sem teto).
- UX informa o número útil: "Este Deck contém N Notes. X já existem na sua coleção (Y arquivadas). Z serão adicionadas."
  Contagem de CardInstances a criar via `generatedCardInstanceCount` (Reverso=2, Cloze=N).
- Pular não consome. Atomicidade: uma RPC, uma transação; falha ⇒ nada criado; compensação de mídia como no P7.

## J. Concorrência
- Sem índice único (duplicatas intencionais são legais). `pg_advisory_xact_lock` por copiador no início da RPC; a
  equivalência é **recalculada sob o lock, por assinatura** (nunca por posição). Se surgir EXACT sem decisão do
  cliente ⇒ `duplicates_changed` (nada criado), como `media_map_incomplete`.
- **Garantia real (analisada, lock por copiador é suficiente para importações):**
  - Duas abas do mesmo usuário / dois imports do mesmo Deck / dois imports de Decks diferentes com a mesma Note: todos
    têm o **mesmo copiador ⇒ mesmo lock ⇒ serializados**; o 2º enxerga o que o 1º criou, recalcula e recebe
    `duplicates_changed` (precisa reanalisar). Nenhuma chave por conteúdo é necessária: a coleção é sempre de um só dono.
  - Usuários diferentes não compartilham coleção ⇒ não conflitam.
  - **Lacuna residual (aceita):** criação fora do fluxo de importação (editor manual, import Anki) não toma esse lock;
    na janela entre análise e commit pode surgir 1 EXACT local novo. Pior caso: 1 Note duplicada a mais (nunca perda
    de dado, nunca alteração de Note existente). Não se inventa lock adicional.
- Edição da Note local na janela análise→commit: classificação velha por no máximo uma execução; inofensivo.

## K. Riscos
1. Normalização conservadora gera falsos negativos (acento/pontuação) — preferível a falsos positivos.
2. Sem `source_*`, Note editada deixa de ser reconhecível como "a mesma" — consequência da cópia independente; VARIANT mitiga.
3. Divergência SQL×JS se alguém reimplementar a assinatura (mitigado por §D e teste de paridade).
4. Dívida: Anki mantém dedup defeituosa até a fase própria.
5. Performance: assinatura da coleção por requisição (hash join); medir antes de coluna armazenada.
6. UX em Deck grande (500+): seleção em lote por classe.
7. Árvore importada diferente da original (Notes EXACT em outros Decks) — assumido (§C).

## L. Testes propostos (implementação futura)
SQL (Postgres local): assinatura estável; EXACT/VARIANT/cross‑family/NONE por A–M; Legacy×Native×incompatível;
irmãos (reverso=1 Note, Cloze 3 marcas=1); Tags/Deck/mídia/attribution não alteram a classe; **EXACT em outro Deck não é
recriada nem movida**; **EXACT arquivada detectada, não recriada, não desarquivada**; **EXACT sem `criado-por` não ganha
Tag**; pular não cria nem toca nada (hash da Note local idêntico, `revision`/FSRS iguais, 0 CardInstances novas);
reimportação do mesmo Deck ⇒ tudo EXACT, 0 criadas; após editar local ⇒ VARIANT, 0 sobrescritas; despublicar/excluir/
trocar `display_name` do autor não afeta a detecção; Course/Teacher/trilha não comparados; **nome de Deck repetido:
`Nome (2)`, `(3)`; Decks sem Note nova omitidos, ancestrais preservados; nenhuma Note existente movida**; seleção parcial (só as marcadas criadas;
irmãos juntos; limite); contagem 2000 sobre a origem; contagem de CardInstances; **concorrência: duas sessões do mesmo
usuário (1 cria, 2º `duplicates_changed`), dois imports de Decks distintos com a mesma Note**; manifest filtrado (sem
mídia de Notes não criadas); mídia local existente nunca substituída. Cliente (Playwright fr+zh): fluxo completo do §Q,
erro ambíguo mantém mídia (P7), reentrância. Paridade: o JS não contém normalização própria.

## M. Arquivos que mudariam
`shared/supabase_migrations/062_public_deck_duplicates.sql` (novo); `shared/public-deck.js` (fluxo em fases + UI mínima
de análise/seleção); `tests/fase-public-deck/*`; este doc e o contrato técnico. **Não** tocam `shared/anki-import.js`,
FSRS, Review, Study Trail, Identity nem attribution.

## N. Migrations
Uma (062, **só funções**, sem tabela/coluna/backfill): `note_content_signature`, `note_variant_key`,
`check_public_deck_duplicates(p_public_id, p_dest_deck_id)`, extensão compatível de `copy_public_deck(...,
p_selected jsonb default null)` (decisão por Note/assinatura) e do manifest (só Notes a criar). Coluna `content_key`
armazenada + índice **não** é proposta. **Não aplicar sem aprovação.**

## P. Decisões
### P.A Decisões de produto aprovadas (incorporadas)
1. v1 **sem merge** de conteúdo existente; nenhuma Note local é alterada.
2. EXACT existente sem attribution: só informar.
3. EXACT em outro Deck: não recriar, não mover; identidade independe do Deck.
4. Nome de Deck repetido: sufixo `(2)`… (v1 só nova árvore; "adicionar a Deck existente" = v1.1).
5. Importação parcial por Note: aprovada; seleção simples, Note como unidade, irmãos juntos, respeita limite/atomicidade.
6. Arquivadas participam da detecção; sinalizadas; não desarquivar/alterar.
7. Guardrail 2000 sobre a árvore de origem + UX mostra Notes novas a criar; limite Free é regra separada.
8. Anki fora desta fase (fase própria posterior).
9. Attribution inalterada (Tag `criado-por-[username]`, sem `source_*`, não é chave).
10. FSRS: detectar/pular não altera nada; sem reset/merge de histórico.
11. Mídia: EXACT não copia; Note nova com cópia física independente; sem dedup de Storage.
12. Concorrência: lock por copiador + recálculo sob lock + `duplicates_changed` (garantia analisada em §J).
13. Normalização v1 (NFC+trim+espaços+case‑fold; acentos/pontuação preservados) e regra de chave de variante/rótulo
    cross‑family: **mantidas como propostas, sem objeção** (consideradas aceitas, revisáveis).
14. "Criar mesmo assim" para EXACT: **removido da v1** (EXACT existente nunca gera segunda Note; reutilização é ação
    explícita futura).

### P.B Decisões fechadas nesta revisão
15. Deck sem Note nova: **omitir** (mantendo ancestrais necessários à hierarquia).
16. VARIANT: **desmarcada por padrão**, selecionável. Cross‑family: **apenas informativa**, fora da seleção.
17. Adicionar a Deck existente: **v1.1**; a v1 só cria nova árvore.
18. Lacuna de concorrência (editor manual/Anki sem lock): **aceita e documentada** (§J).

Não resta decisão de produto bloqueando a implementação da v1.

## Q. Fluxo de importação (lógico)
1. Usuário seleciona o Public Deck (`#/deck/<id>`).
2. Carrega metadata pública (Premium/dono exigido para conteúdo).
3. Obtém o manifest de conteúdo (tamanho da árvore validado contra o guardrail de 2000).
4. **Servidor** normaliza e calcula assinaturas das Notes públicas (`note_content_signature`).
5. Compara com a coleção local do usuário (mesmo idioma, ativas+arquivadas, qualquer Deck pessoal).
6. Classifica cada Note: EXACT (ativa/arquivada) / VARIANT / cross‑family / NONE / não comparável.
7. Apresenta o resultado: total, já existentes, arquivadas, variantes, **Notes que serão criadas** e CardInstances.
8. Destino = nova árvore (único modo da v1). Usuário vê as informativas (cross‑family) e seleciona entre as criáveis (NONE marcadas, VARIANT desmarcadas).
9. Valida limites (guardrail 2000 na origem; limite Free não se aplica a Premium).
10. Resolve nome do Deck (sufixo `(2)`…) e poda Decks sem Note nova.
11. Novo manifest de mídia **somente** das Notes a criar.
12. Cópia física da mídia (`storage.copy` para a pasta do copiador).
13. RPC transacional `copy_public_deck`: toma o lock do copiador, **recalcula a equivalência sob o lock** (único ponto de
    prevenção de corrida; se mudou ⇒ `duplicates_changed`, nada criado), valida mapa de mídia, cria Decks e Notes.
14. Commit (tudo ou nada; compensação de mídia só em erro definitivo, P7).
15. Resultado final: criadas / já existentes / puladas, com avisos.

## O. Estado
Contrato fechado para a v1 (§P). Pronto para implementação (migration 062 ainda não criada/aplicada).

## R. Implementação V1 (migration 062 — local, NÃO aplicada)
**Banco (só funções):** `_note_norm`, `_note_field_component`, `_note_dup_parts` (família, modo, `sig`, `vkey`, `pkey` — SHA‑256 sobre a forma nativa), `note_content_signature(own_flashcards)`,
`note_variant_key(own_flashcards)`, `_note_instance_count`, `_public_deck_plan(_json)` (classifica a árvore pública contra a coleção do copiador, ativas+arquivadas, qualquer Deck),
`_public_deck_resolve_selection`, `_unique_deck_name`, `check_public_deck_duplicates(public_id, dest)` (somente leitura, Premium), e as versões novas de
`get_public_deck_media_manifest(public_id, p_selection)` e `copy_public_deck(public_id, dest, media_map, p_selection)`. Nenhuma tabela/coluna/índice/backfill.
**Seleção:** `p_selection = [{sig, cls}]` (plano confirmado). `NULL` = padrão (só `none`). Sob o lock a classificação é recalculada e comparada com `cls`;
qualquer divergência (EXACT surgiu, VARIANT virou EXACT, NONE virou VARIANT/cross) ⇒ `duplicates_changed`, nada criado. `cross_family`/`exact*` na seleção ⇒ `duplicates_changed`/`invalid_selection`.
**Classes retornadas:** `exact`, `exact_archived`, `variant`, `cross_family`, `none`, `source_duplicate` (mesma assinatura repetida dentro do próprio Public Deck: só a 1ª é candidata).
**Decks:** só os que têm Note criada + ancestrais; nome único entre irmãos (`Nome (2)`, `(3)`…); sem casca vazia. **Cliente:** painel de plano inline (`shared/public-deck.js`), o JS só repassa `sig` opaca.
**Divergências em relação ao texto do contrato (todas deliberadas):**
1. `p_decisions`/`p_skip_signatures` viraram um único `p_selection` com `cls` (mais forte: compara a classe, não só a assinatura).
2. Limite Free de 20 CardInstances: Free não importa Public Deck (`premium_required`, inalterado), então o limite não se aplica; o custo em CardInstances é calculado no plano (`instances`).
3. `lower()` (case‑fold v1) depende do `lc_ctype` UTF‑8 do banco (produção: UTF‑8); `\s` ampliado para NBSP/espaços Unicode.
4. O plano usa `pos` (ordem por criação) e `preview`, não o `idx` de `get_public_deck_notes` (que só cobre a raiz).
5. Custo de CPU: plano de 2000 Notes contra 2000 locais ≈ 1,7 s (benchmark local); importação de 2000 Notes ≈ 4,4 s.
6. Teste H11 da fase de hardening foi atualizado: reimportar o mesmo Deck agora **não** cria 2ª árvore (tudo EXACT).
**Lacuna aceita (inalterada):** editor manual e import Anki não tomam o lock; numa corrida pode surgir 1 duplicata extra, sem perda de dado.

## §S — P8: validação pré-produção (2026-10-02)

**Estado**: Public Deck + P7 + duplicatas V1 continuam **NÃO validados em staging**. Não existe staging (o único projeto Supabase, `mandarim-do-zero`, é produção; sem branches). Criar branch/projeto gera custo e não foi autorizado.

**Bloqueio pré-produção: Storage real ainda não validado.** Pendentes em staging: `test_real_storage_integration.js` (JWT real, policies de `storage.objects`, `storage.copy`), fluxo A–U, concorrência com duas sessões reais, performance, sequência 059→063 num banco Supabase real.

**Feito localmente (Postgres 16 + Playwright)**: cadeia 059→063 aplicada em ordem sem erro; uma única assinatura por função (sem overload órfão); `SECURITY DEFINER` com `search_path=public`. Suítes: Public Deck 87/87, P7 48/48, hardening 20/20, duplicatas 72/72, concorrência 7/7, Legacy parity 17/17, Playwright 152/152, Identity 60/60 (banco novo), K1 86, Tags 67, G 134, E 75, F 68, H 78, J 85. Performance local (não é SLA): 500/1000/2000 Notes ≈ 0,56/1,4/3,4 s; 2001 → `deck_too_large`. Case-fold: caixa e espaços/NBSP normalizados; acentos e pontuação continuam distinguindo; NFC sem falso negativo.

**Auditoria estática da 062** (subagente + verificação no banco vivo, só leitura):
- **Achado real, corrigido: auto-promoção a Premium.** `profiles_owner_update` permite UPDATE da própria linha e nada protegia `plan_tier`/`role` (confirmado em produção: sem trigger de proteção e com UPDATE de coluna para `authenticated`). Qualquer usuário contornava o gate Premium das 3 RPCs. Falha **anterior** à V1 (039/024). Correção: migration **063** (trigger; só o admin por e-mail do JWT ou papéis internos alteram `plan_tier`/`role`). Testada local: usuário comum barrado, admin e outras colunas livres. **063 NÃO aplicada em produção** — deve ser aplicada antes ou junto das demais, por decisão da autora.
- Baixo, não corrigido (sem escalada de privilégio): host da URL não ancorado em `flashcard_media_path`/`_validate_media_map`; manifesto sem teto `deck_too_large` (só timeout para o chamador); `p_selection` com `cls` ausente dá mensagem enganosa; rollback comentado na 061 obsoleto.
- Sem problemas: `auth.uid()`, ids de terceiros, nenhuma sobrescrita de Note, atribuição obrigatória, sem SQL dinâmico, lock por copiador sem ciclo, grants.

**Semântica V1 (inalterada)**: sem merge; EXACT (inclusive arquivada) não é recriada; VARIANT opcional e desmarcada; cross-family informativa; destino em Deck existente é V1.1; árvore sem Note nova é omitida; atribuição permanente; mídia independente; reimportação só acrescenta; lock cobre imports do mesmo usuário (editor manual/Anki fora); 2000 é guardrail técnico; 20 CardInstances é regra Free separada.

### §S.1 — Staging aplicado e migration 064 (2026-10-02)

Staging (`ilfjzizjfcmhibkhwber`) recebeu 001→063 via Supabase CLI (histórico oficial registrado; funções, policies e Storage idênticos à cadeia local estrita). Achado: a tabela `progress` nunca foi versionada (criada no Dashboard da produção). A migration **064** a versiona de forma idempotente e não destrutiva (no-op estrito onde já existe; só aditiva em tabela parcial); contrato extraído da produção por leitura. A cadeia 001→064 é agora autossuficiente em banco novo. **064 NÃO aplicada em produção nem no staging** (staging: via `db push` com o pacote atualizado).

### §S.2 — P8: homologação no Staging (2026-10-02) — PARADA em defeito

**Correção de §S/§S.1 (item I).** O texto acima ficou desatualizado: o Staging existe (`ilfjzizjfcmhibkhwber`) e está na **066**. As migrations 001→066 foram aplicadas pelo CLI (versões `20250101000001`…`066`, sem buracos). As migrations **064, 065 e 066 foram aplicadas e validadas no Staging**:
- 064 (`progress` versionada) foi aplicada na cadeia;
- 065: paridade de GRANTs, 252/252;
- 066: INSERT de `profiles` protegido; teste real de login A1/A2/B1/B2/C passou.

A produção (`eigjocalzwamisgqilhg`) não recebeu nada desta série. Este é o registro de **P8.4**: não houve reaplicação.

**Como foi testado.** As suítes locais foram portadas para o Staging e executadas via MCP. Cada execução é uma única transação que termina em `RAISE`, o que força um rollback: resíduo zero, verificado após cada execução (0 Decks, 0 Notes, 0 objetos no Storage, 3 perfis inalterados). Três limitações da ferramenta, registradas:
1. **Instruções `DELETE` ou `UPDATE` sem `WHERE` acionam uma confirmação "destrutiva" do MCP.** Ela não aparece aqui: a chamada nunca chega ao Postgres (conferido nos logs) e expira em 60 s. Por isso as suítes evitam essas instruções. "Apagar a origem" e "apagar objeto do Storage" foram substituídos por verificações estruturais de independência (nenhuma URL da cópia aponta para a pasta do autor).
2. **`now()` é fixo na transação.** Os testes de `content_updated_at` envelhecem os timestamps, com o trigger de toque desligado só durante o ajuste e dentro da transação revertida.
3. **As sessões são simuladas** (`set local role authenticated` + `request.jwt.claims`). Valida RLS, RPCs e triggers reais, mas **não** valida JWT real, policies de `storage.objects` via API nem `statement_timeout` por papel (ver D1).

Ao portar as suítes, foram corrigidas verificações que passavam sem provar nada: UUIDs falsos em `like '%…%'`, um `true` fixo em Z2, comparações com o próprio valor, e a checagem "dono não copia" no K. A versão corrigida é a que foi executada.

#### A. Matriz A–M (duplicatas) — Staging, suíte de duplicatas 72/72

| Caso | Resultado | Evidência (checagens) |
|---|---|---|
| A | PASS | C1/C4/C9/C10 EXACT; I3 `skipped_exact=8`; I2 cria só as 7 NONE |
| B | PASS | I5: Tags locais `{minha,sem-attr}` intactas; I4 hash da coleção local igual |
| C | PASS (parcial) | C1 EXACT em outro Deck; I4 nada movido. O texto "informa em qual Deck" (UI) não foi verificado no Staging |
| C2 | PASS | C2 `exact_archived` + `local_archived`; I3 `skipped_exact_archived=1`; nada desarquivado (I4) |
| D | PASS (parcial) | C6/V1/V2 cross-family não selecionável e recusado na RPC. Só exercitado com Normal×Reverse |
| E | PASS | C7 desmarcada; V5/V6 seleção explícita cria Note independente, local `pomme/fruta` intacta; P1 |
| F | PASS | C5: acento e pontuação distinguem (NONE) |
| G | PASS | C6 (cross-family) e C8 (Reverse custa 2 CardInstances) |
| H | PASS (local, 2026-10-05) | C8/I12/Z5 + `test_duplicates_hjk.sql`: Cloze igual (caixa/espaços) = EXACT; mesma frase com marcas diferentes = VARIANT desmarcada; Cloze x Normal = NONE |
| I | PASS | S9/C9: ordem de distratores e caixa irrelevantes → EXACT |
| J | PASS (local, 2026-10-05) | C11 + `test_duplicates_hjk.sql`: Type Answer x Type Answer = EXACT; Type Answer x Normal (e o inverso) com o mesmo par = cross_family, não selecionável |
| K | PASS (local, 2026-10-05) | `test_duplicates_hjk.sql`: cartão da professora com o mesmo conteúdo na coleção do copiador não conta (NONE) e a cópia não o toca. Course não tem Notes no banco |
| L | PASS | S7/C10 Legacy compatível = Native; S8/C10 incompatível fora do plano |
| M | PASS | S10 attribution não entra na assinatura; I6 Notes novas com a atribuição do autor; I5 existentes intocadas |

Também confirmados no Staging:
- Recálculo sob lock / plano velho: X1/X2/X3 → `duplicates_changed`, nada criado.
- `media_map_incomplete`: V7.
- Guardrail: L1 `deck_too_large` com GUC 3.
- Destino: L4/L5.
- Despublicado: Z2 `unavailable`.
- Assinatura zh: Z3/Z4.

#### B. §15.1–§15.11 (contrato técnico)

| Bloco | Staging (SQL real) | Só local |
|---|---|---|
| 15.1 Publicação | PASS (suíte Public Deck 88/88: kinds recusados, não-dono, escrita direta de campos públicos barrada pelo guard, idempotência) | — |
| 15.2 Perfil | PASS no SQL (`list_public_decks_for_user`, `public_profile=false` esconde sem despublicar) | Exibição na UI |
| 15.3 Rota | Não aplicável a SQL | Playwright local |
| 15.4 Conteúdo | PASS no SQL (`get_public_deck_notes` sem `note`/FSRS/`owner_id`; os 5 tipos) | Renderização nos 4 renderers |
| 15.5 Contagem | PASS (Reverse=1 Note/2 instâncias, Cloze N; arquivadas fora) | — |
| 15.6 Atribuição | PASS (autor, cópia, cópia de cópia — K; falsificação via payload barrada) | — |
| 15.7 Permissões | PASS (owner/visitante/autenticado/Free/anon; RLS de `decks`) | — |
| 15.8 Importação | PASS no SQL (independente, Tags, Free barrado, duplicatas, atomicidade, destino). Mídia: suíte 48/48 + hardening 20/20 (H15/H16 revalidados com envelhecimento) | Storage via API: ver P8.1/P8.5 |
| 15.9 Privacidade | PASS (privado/despublicado = mesma resposta; sem FSRS/Teacher/`note`; `public_id` opaco) | — |
| 15.10 Reports | NÃO TESTADO no Staging | Local |
| 15.11 Regressão | NÃO TESTADO no Staging | Suítes locais (§S) |

#### C. P8.1–P8.6

- **P8.1** `test_real_storage_integration.js`: **BLOQUEADO.** Exige login real de 2 contas (`PD_A_*`/`PD_B_*`), e as senhas não existem nesta sessão (não devem ir pelo chat). Precisa ser rodado pela autora, como o teste de auth da 066.
- **P8.2** concorrência com 2 sessões reais: **BLOQUEADO** (mesmo motivo). Dados compartilhados exigiriam commit e depois limpeza com `DELETE`, que o MCP não executa sem confirmação. A lógica de recálculo sob lock passou em sessão única (X1–X3).
- **P8.3** performance: **FEITO, com defeito (D1).**

  | Notes | Plano (check) | Cópia | Resultado |
  |---|---|---|---|
  | 500 | 0,22 s | 1,35 s | 500 copiadas |
  | 1000 | 0,41 s | 3,73 s | 1000 copiadas |
  | 2000 | 0,84 s | 10,81 s | 2000 copiadas |
  | 2001 | — | — | `deck_too_large` no plano e na cópia (10 ms), nada criado |

  Atribuição correta em todas as Notes copiadas. Os testes não usaram mídia.
- **P8.4**: registrado (Staging na 066, sem reaplicação).
- **P8.5** fluxo real de mídia ponta a ponta (manifest → `storage.copy` → cópia → independência física → recuperação): **BLOQUEADO** (precisa de JWT real e API do Storage). A lógica SQL de mapeamento/compensação passou na suíte de mídia.
- **P8.6**: **nada a limpar.** Todas as execuções foram revertidas; baseline conferido (0 Decks, 0 Notes, 0 objetos, 3 perfis inalterados).

#### D. Local × Staging

| Onde | O que foi validado |
|---|---|
| Postgres real do Staging | RPCs, RLS, triggers, assinaturas e performance |
| Só localmente | UI e Playwright (Rota, renderers, Reports, regressão de app) |
| Em nenhum dos dois | JWT real + Storage via API (P8.1/P8.5) e duas sessões reais (P8.2) |

#### E. Defeitos

**D1 — `copy_public_deck` é quadrática e a cópia grande estoura o timeout da API.**
- **Causa:** no laço de Notes (062, função `copy_public_deck`), cada Note faz `jsonb_to_recordset(v_plan) … where p.f_id = f.id`, ou seja, varre o plano inteiro a cada Note. Custo O(n²). Tempo medido (P8.3): ×2,8 a cada vez que o tamanho dobra.
- **Impacto:** o papel `authenticated` no Staging tem `statement_timeout=8s` (a produção usa o padrão Supabase; não conferido nesta etapa). Reproduzido: cópia de 2000 Notes com `statement_timeout=8s` → `57014 canceling statement due to statement timeout`, apontando para essa linha. Rollback total, nada parcial.
- **Limite efetivo:** estimado em ~1.600 Notes (extrapolado, não medido) — abaixo do guardrail documentado de 2000.
- **Por que não apareceu antes:** localmente 2000 levou 3,4 s.
- **Correção:** exige migration (resolver o plano por `f_id` uma vez, por exemplo um objeto jsonb indexado). **Não feita: aguardando autorização.**

Nenhum outro defeito encontrado.

#### F. Os 4 achados de baixo risco da 062

Continuam abertos e não viraram bloqueio: host não ancorado, manifest sem teto, mensagem com `cls` ausente, comentário de rollback.

Relação com D1: o manifest sem teto tem a mesma natureza de tempo. Vale decidir junto com D1, mas não bloqueia nenhuma garantia testada.

#### G. Estado

**Homologado no Staging (SQL real):**
- A–M, exceto H/J parciais e K não testado;
- §15.1, 15.2, 15.4–15.9 no nível do banco;
- P8.3 (com D1);
- P8.4 e P8.6.

**Pendente:**
- D1;
- P8.1, P8.2, P8.5 (precisam da autora);
- H/J/K;
- §15.3, 15.10, 15.11 no Staging (UI).

**Staging ≠ autorização para produção.**

#### H. Decisões da autora antes da produção

1. Autorizar a migration de correção de D1, testada localmente e depois aplicada via MCP no Staging (067), com nova rodada de P8.3. Alternativas: baixar o guardrail para ~1000, ou aumentar o timeout do papel (não recomendado).
2. Rodar P8.1, P8.2 e P8.5 com as contas de teste (senhas só no terminal ou em variáveis de ambiente).
3. Decidir sobre os 4 achados de baixo risco.
4. Decidir se H/J/K precisam de teste antes da produção.
5. Ordem de aplicação na produção: 063 → 066 junto com 059–062 e a correção de D1.

### §S.3 — Staging: 067 e 068 aplicadas; D1 e D2 resolvidos (2026-10-03)

**Correção do estado (substitui o "Staging na 066" de §S.2).** Desde 2026-10-03 o Staging (`ilfjzizjfcmhibkhwber`) está na **068**. 067 e 068 foram aplicadas via MCP (fluxo do caminho A, ver CLAUDE.md):

| Migration lógica | Versão no Staging | Arquivo |
|---|---|---|
| 067 `public_deck_copy_linear_plan` | `20261003000046` | commit `69cad4c` |
| 068 `public_deck_copy_media_linear` | `20261003015924` | commit `c97222e` (md5 `c7b4052f76abede91ed86cb656e0fc6b`, idêntico byte a byte ao aplicado) |

A produção (`eigjocalzwamisgqilhg`) continua sem nenhuma migration desta série.

#### A. Migration 068 — integridade

Antes da aplicação:
- confirmado projeto "Idiomas com Prof. Brune — Staging";
- última migration era a 067;
- não havia nenhuma 068;
- o arquivo era idêntico ao de `c97222e`.

Depois da aplicação:
- `pg_get_functiondef` de `_validate_media_map`, `get_public_deck_media_manifest` e `copy_public_deck` tem md5 **idêntico** ao do Postgres local com a 068;
- uma assinatura por função, sem overload;
- owner `postgres`, `SECURITY DEFINER` e `search_path=public` nas três;
- volatilidade: STABLE, STABLE e VOLATILE, respectivamente;
- grants: EXECUTE só para `authenticated` nas duas RPCs; `_validate_media_map` sem EXECUTE para public, anon e authenticated;
- `_public_deck_plan`, `check_public_deck_duplicates` e `flashcard_media_path` inalteradas (mesmo md5 de antes);
- schema e dados inalterados: hash de colunas `cceaae4a…`, 0 Decks/Notes/objetos e 3 perfis (hash `fa3a12ad…`) antes e depois;
- `authenticated` continua com `statement_timeout=8s`.

#### B. D1 (cópia quadrática) — RESOLVIDO no Staging pela 067

Sem mídia, 2000 Notes copiam bem abaixo de 8 s, tanto com a 067 (4,57 s) quanto com a 068 (3,76 s).

#### C. D2 (mídia na cópia) — RESOLVIDO no Staging pela 068

**Método.** O mesmo script SQL da rodada da 067 (`stg_perf`), só com N e mídia parametrizados:
- seed com 10% de Cloze (2 marcas) e 90% Normal;
- seleção explícita igual a `publicDeckPlanSelection` (`[{sig, cls}]` das Notes `selectable` e `none`), nunca o caminho default;
- cada RPC numa instrução própria, com `statement_timeout=8s` e sessão `role authenticated` simulada;
- o mapa de mídia aponta para objetos reais na pasta do copiador (o `storage.copy` é simulado com INSERT em `storage.objects`);
- cada execução numa transação única que termina em `RAISE` (rollback).

| Cenário | Check | Manifest | Cópia | Total | Notes | CardInstances | Timeout |
|---|---|---|---|---|---|---|---|
| A 500 sem mídia | 0,21 s | 0,19 s | 0,68 s | 1,08 s | 500 | 550 | não |
| B 1000 sem mídia | 0,41 s | 0,40 s | 1,63 s | 2,44 s | 1000 | 1100 | não |
| C 2000 sem mídia | 0,79 s | 0,84 s | 3,76 s | 5,40 s | 2000 | 2200 | não |
| D 500 com áudio | 0,22 s | 0,26 s | 0,87 s | 1,35 s | 500 | 550 | não |
| E 1000 com áudio | 0,44 s | 0,54 s | 1,92 s | 2,90 s | 1000 | 1100 | não |
| **F 2000 com áudio** | 0,90 s | 1,12 s | **4,61 s** | 6,63 s | 2000 | 2200 | **não** |
| F, 2ª rodada | 0,94 s | 1,24 s | 4,73 s | 6,91 s | 2000 | 2200 | não |

Em F: 2000 mídias remapeadas, 2000 objetos distintos referenciados. Cada RPC é uma requisição separada, com o seu próprio limite de 8 s; a cópia, a mais lenta, usa cerca de 59% do limite. Nenhum erro.

**067 → 068 no Staging:**
- 2000 com áudio: cópia **cancelada (57014)** → **4,61–4,73 s**;
- 1000 com áudio: 3,97 s → 1,92 s;
- manifest a 2000: 1,44 s → 1,12–1,24 s;
- sem mídia, a 068 também ficou mais rápida (2000: 4,57 → 3,76 s), porque deixou de chamar as funções de mídia por Note.

#### D. 2001 Notes

- Check e cópia: `deck_too_large` (54000) em 7–8 ms.
- Manifest: `deck_media_too_large`, porque são 2001 mídias acima do teto de 2000. Mesma regra de antes; a função é só leitura.
- Nada foi criado: o copiador ficou com 0 Notes e os mesmos 2 Decks (raiz e Meus Decks).

#### E. Atomicidade (2000 Notes com áudio)

1. Mapa completo **sem** o áudio da última Note na ordem de cópia (`perf-audio-2000`, 1999 entradas): `media_map_incomplete` (22023) em 1,29 s.
2. Destino da última mídia apontando para um objeto inexistente: `invalid_media_map` (22023).

Nos dois casos o copiador ficou com 0 Notes e 0 Decks extras, e as 2000 Notes do autor ficaram intactas. Na 068 a falha de mapa é detectada **antes** do laço (nada chega a ser inserido); na 067 era detectada dentro dele, com rollback. O resultado observável é o mesmo.

#### F. Independência da mídia (lógica, no banco)

- Em A–F: todas as URLs das cópias apontam para a pasta do copiador e para objetos existentes; 0 apontam para a pasta do autor.
- No smoke de 10 Notes, cujas fontes tinham `storagePath` e `generationKey` em 10 de 10, as cópias ficaram com **0** desses campos.
- **Isto não é P8.1/P8.5**: a cópia física via API do Storage com JWT real continua pendente.

#### G. Limpeza

Todas as execuções foram revertidas. Estado final idêntico ao snapshot anterior à 068:
- 0 Decks, 0 Notes, 0 Teacher Cards e 0 objetos;
- 3 perfis com o mesmo hash;
- schema com o mesmo hash;
- 068 continua aplicada.

#### H. Estado dos itens P8

| Item | Estado |
|---|---|
| D1 | **Resolvido** (067) |
| D2 | **Resolvido** (068), medido no Staging |
| P8.1 Storage real | Pendente: precisa da autora com login real |
| P8.2 duas sessões reais | Pendente: mesmo motivo |
| P8.5 mídia ponta a ponta | Pendente: mesmo motivo |
| H/J (Cloze/Type Answer EXACT/VARIANT) | Testado localmente (9/9, `test_duplicates_hjk.sql`) |
| K (Teacher/Course na coleção) | Testado localmente (mesma suíte) |
| 4 achados de baixo risco da 062 | Host ancorado em `*.supabase.co` pela 071 (Staging+produção, 2026-10-05). Manifest: custo linear e teto de 2000 mídias já existentes, aceito. Mensagem sem `cls` e comentário de rollback: cosméticos, não alterados |

**Staging ≠ autorização para produção.**

### §S.4 — D3: `duplicates_changed` em retry infinito; migration 069 e correção do script (2026-10-03, LOCAL)

**Homologação real (autora, Staging, RUN `p826100311325253ce`)**: P8.1 14/15, P8.2 9/12, P8.5 40/44, LIMPEZA 13/14.
Diagnóstico por consulta só de leitura no Staging (autorizada):

- **D3 (defeito real):** `_public_deck_resolve_selection` (062) levanta `duplicates_changed` com SQLSTATE `40001`.
  O PostgREST repete automaticamente transações com 40001; como a recusa é determinística, repete sem fim.
  No Staging: ~16.000 execuções em ~7 min (uma a cada ~10 ms), só pararam quando a limpeza despublicou o Deck.
  O cliente recebeu HTTP 504, tratou como incerto e, de propósito, não apagou a mídia já copiada.
  Isso explica os órfãos do F4 e do tab perdedor da P8.2c. O perdedor nunca criou Note/Deck.
- **Falsos negativos do script:** a exclusão era conferida pelo link público, que continua servido por cache depois do
  delete. Os arquivos foram de fato apagados (Staging: 0 objetos nas duas contas depois do teste).
- **Cascata:** F5 e "4 objetos novos" comparavam com a linha de base anterior ao F1 e herdavam os órfãos do F4.

**Reprodução local com o PostgREST 12.2.12 real** (não simulado): com 40001, uma única chamada fica em loop e o
loop continua depois que o cliente desiste. Medido por código, numa chamada: `40001` ≈ 25.500 execuções;
`40P01`, `P0001`, `PT409`, `22023` e `55P03` executam 1 vez cada.

**Migration 069** (`069_public_deck_duplicates_changed_not_retryable.sql`, aplicada SÓ no Postgres local):
troca o errcode das 2 ocorrências para `PT409`. É o mecanismo documentado do PostgREST para escolher o status HTTP,
então a resposta vira **409 Conflict**. A mensagem continua `duplicates_changed`, que é o que o cliente lê.
Corpo, assinatura, `immutable`, `search_path` e grants são idênticos à 062 (diff = só as 2 linhas).

| Verificação local (PostgREST real) | 068 | 069 |
|---|---|---|
| F4 (classe trocada) | loop, cliente desiste | HTTP 409 em 13 ms, 1 execução, 0 Notes |
| Corrida de 2 sessões, 400 Notes | — | sobrepostas; 1 vence com 400; outra 409 em 244 ms; 400 Notes, 1 Deck |
| Script corrigido, cache quente | P8.2 13/16, P8.5 42/44 (o defeito) | **97/97** |
| Script antigo, cache quente | — | falsos negativos de cache em P8.1, P8.5 e LIMPEZA |
| Script corrigido, lock removido (mutação) | — | P8.2 FAIL (800 e 240 Notes) — o teste continua sensível |

Suíte do banco (`run.sh`, agora com a 069): 242 ok, 0 falha. Playwright 152/152. Paridade legado 17/17.

**Script corrigido** (`staging_storage_test.js`): existência só pela listagem do Storage (`storageStat`, lê
`storage.objects`); sobrescrita conferida por eTag/updated_at; o link público só lê conteúdo e gera diagnóstico de
cache. F1–F5 e o caminho feliz têm linha de base própria, tirada imediatamente antes; um cenário que deixa órfãos
continua reprovado mesmo que a limpeza final os remova.

**Estado:** 069 NÃO aplicada no Staging; Staging sem dado alterado por esta etapa; produção intocada; sem push/PR.
Próximo passo depende da autora: aplicar 069 no Staging e repetir o teste real.
