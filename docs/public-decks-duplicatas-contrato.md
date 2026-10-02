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
