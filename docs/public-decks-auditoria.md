# Contrato de Public Decks + atribuição (v3, fechamento das decisões)

> **v4 (2026-10-01):** a auditoria de identidade/username/tag de atribuição está em `docs/identidade-username-tag-auditoria.md` (pendência 8, seções 7.4 e 8 daqui). Colisão real nos dados: nenhuma (26 perfis); proteção server-side do username e da tag `criado-por-*`: inexistente; decisão de produto necessária antes de implementar. **Contrato proposto de identidade (Partes II e III), aguardando aprovação:** `docs/identidade-username-tag-auditoria.md` §27–§33 (seção `APROVAÇÃO NECESSÁRIA ANTES DA IMPLEMENTAÇÃO`).

Somente documentação. Nenhum código, migration, RPC, RLS, rota ou UI foi alterado.
Substitui as versões v1 (`dce4748`) e v2 (`96bbb00`).
**Fonte de verdade:** `docs/arquitetura-total-decks-tags-painel.md` (citada como "AT §n" / "inv. n").
Rótulos: **FECHADO** (decidido pela fonte citada) ou **DECISÃO PENDENTE** (nenhuma fonte decide; não foi inventado).

## 1. Fonte de verdade e hierarquia de evidência
1) Arquitetura Total; 2) decisões já registradas em `CLAUDE.md`; 3) decisão explícita da autora nesta etapa;
4) código atual, usado só para achar restrições técnicas, nunca para decidir comportamento.
`source_user_id/source_card_id` **não são requisito**: vieram de prompts, o documento define atribuição por Tag.

## 2. Regras fechadas pela Arquitetura Total
| # | Regra | Fonte |
|---|---|---|
| 1 | Só Decks DENTRO de Meus Decks podem ser públicos | AT §18 |
| 2 | `personal_root` (o próprio Meus Decks) não é público | AT §18 ("dentro de") |
| 3 | Curso, Professora e raiz do idioma nunca são públicos | AT §18 |
| 4 | Atribuição = Tag permanente `criado-por-[username]`, não removível pelo destinatário | AT §10.3, inv. 14 |
| 5 | Username único e imutável; display name editável | AT §20, inv. 15 |
| 6 | Free sabe que o Deck existe, não abre nem importa; Premium importa de qualquer usuário | AT §18.2 |
| 7 | Limite Free por CardInstance; cria só o que cabe, informa o corte, CTA Premium; nunca silencioso | AT §17, inv. 21, 28 |
| 8 | Cópia independente, sem live link; Notes, Cards e Tags independentes; original nunca alterado | AT §19, §34, inv. 16 |
| 9 | Em cópias múltiplas preserva-se só a atribuição ORIGINAL | AT §10.3 |
| 10 | Sem assinatura/atualização: o autor edita/adiciona/renomeia e o Deck segue o mesmo; quem importou reimporta manualmente | AT §19.1 |
| 11 | Reimportação detecta Deck/Notes semelhantes, avisa, oferece importação/merge, nunca duplica em silêncio; política conservadora | AT §19.1, §23, inv. 28 |
| 12 | Importado entra em `Idioma > Meus Decks` ou subdeck pessoal; nunca raiz "Importado" | AT §22, §24 |
| 13 | Página pública: nome, nº de Notes, descrição, idioma, autor, última atualização, Cards; sem lista/contagem de Tags (Tags aparecem dentro dos Cards) | AT §18 |
| 14 | Ícone e cor escolhidos; sem upload de imagem | AT §18.1 |
| 15 | Sem busca pública de usuários | AT §20 |
| 16 | Excluir Deck pessoal: mover ou apagar permanentemente, árvore inteira; sem arquivamento | AT §5.4 |
| 17 | Normal=1, Reverse=2, Cloze=N CardInstances; irmãs sempre no mesmo Deck | AT §8, inv. 2, 7 |
| 18 | Fonte do conteúdo = Note + Fields + Card Type; Legacy só compatibilidade | AT §27, inv. 23-24 |
| 19 | Sem migração destrutiva; sem duplicata silenciosa; sem nova entidade antes de auditar | inv. 28-30 |
| 20 | Cópia passa a ser conteúdo pessoal editável/movível | AT §34 |

## 3. Estado atual do código (verificado)
Perfil Público por conta (`public_profile` default true), rota `#/user/<username>`, RPCs `get_public_profile_stats`
e `get_public_flashcards` (SECURITY DEFINER, `anon`); cópia via `createOwnFlashcard` com teto tudo-ou-nada; Premium
existe (`plan_tier`); `decks.is_public` sem uso, trigger rejeita root/teacher_root/teacher/course e **permite**
`personal_root` e `personal`; `hidden_from_profile` por cartão; Painel de Tags (rename/delete) sem noção de tag
protegida; "Arquivados" na UI; username editável em `saveProfileEdits`.

## 4. Conflitos entre contrato e código
| # | Conflito | Regra violada |
|---|---|---|
| C1 | Username editável (UI + banco: só `unique`, sem trigger de imutabilidade) | regra 5 |
| C2 | RPC pública lê espelho Legacy (`front`, `back_trans`); Cloze nativo tem `front` nulo, MC perde distratores, mídia por Field não sai | regra 18 |
| C3 | Publicação por conta, não por Deck | regra 1 |
| C4 | Teto Free tudo-ou-nada (preflight `requested<=remaining`) | regra 7 |
| C5 | Gate só de login; sem Premium para importar | regra 6 |
| C6 | Trigger permite `personal_root` público | regra 2 |
| C7 | Painel de Tags e editor poderiam renomear/apagar/**criar** `criado-por-*` | regra 4 |
| C8 | "Arquivados" na UI | regra 16 (fora do escopo público, mas define "ativo") |
| C9 | **Tag de autoria não é injetiva** (ver 7.4) | regra 4 |

## 5. Decisões fechadas nesta etapa
### 5.1 XP, streak e progresso no Perfil Público -- FECHADO (decisão da autora + leitura textual de §20)
Texto de §20: "Pode mostrar: username; display name; avatar; bio; Decks públicos."
- O verbo é **permissivo** ("pode"), não "só pode"; não há seção posterior que proíba ou autorize XP/streak/progresso.
- Portanto **a lista não é exaustiva por texto e não há violação do contrato**. A v2 errou ao afirmar que o
  documento "aponta para remover" (C9 da v2 retirado).
- **Decisão da autora (cabeçalho desta etapa): o Perfil Público continua exibindo XP, streak e progresso.**
  Registrado como decisão de produto, não como silêncio. Não é correção de contrato. Reabrir só por nova decisão.
### 5.2 Ciclo de vida após despublicação, no que toca às cópias -- FECHADO
Cópias são independentes e sem live link (regras 8, 10): despublicar/editar/apagar o original não altera cópia
já feita; a Tag de autoria permanece (regra 4, "permanente"). Fica pendente apenas o que o PÚBLICO vê ao
despublicar (5.7-a).
### 5.3 Free/Premium e visitante -- FECHADO no comportamento (detalhes em 9)
### 5.4 Cópia de cópia -- FECHADO: só a atribuição original (regra 9); copiar um Deck copiado não cria 2ª tag `criado-por-*`.
### 5.5 Reverse/Cloze na atribuição -- FECHADO por herança: tag pertence à Note (inv. 11); irmãs a compartilham.
### 5.6 Descoberta técnica que torna username imutável PRÉ-REQUISITO da atribuição -- ver 7 e 8.
### 5.7 Ainda pendentes -- ver seção 6.

## 6. DECISÕES PENDENTES (a fonte não decide; nada foi inventado)
1. **Formato da rota do Deck público.** AT §20 fixa só `fr/#/user/username`. Restrição técnica real: GitHub Pages
   estático, logo rota hash-based. Falta o desenho (id? slug? username+nome?). Interage com "renomear não muda o Deck" (§19.1):
   o identificador deve ser estável (id), a decidir.
2. **Subárvore.** AT §3.2 define subárvore só para ESTUDO e §5.4 para EXCLUSÃO; **nenhuma regra define publicação.**
   Em aberto: publicar só o Deck, ou Deck+descendentes; publicar filho individualmente; filho privado sob pai
   público; pai despublicado; filho removido/movido da árvore. Impacta nº de Notes exibido e o que a importação copia.
3. **Algoritmo de "semelhante" e merge.** O comportamento é fixo (regra 11); o algoritmo, não. Não definidos:
   unidade de comparação (Note/Fields/Card Type), idioma, normalização, Tags, mídia, Cloze, opções de MC, igualdade
   exata vs similaridade, como o usuário escolhe entre candidatos, se merge preserva FSRS/Tags/Deck, se substitui
   conteúdo, se múltiplas origens semelhantes são permitidas. §23 dá apenas: nome de Deck igual => "(2)" ou inserir
   no existente; ao inserir, detectar igual/similar e oferecer merge, política conservadora.
4. **`hidden_from_profile`.** Não aparece no documento (zero ocorrências de "oculto/hidden"). AT §20 faz o perfil
   mostrar **Decks públicos**, não cartões soltos, mas não manda remover a listagem por conta. Em aberto:
   manter, migrar, remover ou coexistir; e se `public_profile` (interruptor da conta) continua existindo.
5. **Visibilidade pública após despublicar (o que o público vê).** a) a página do Deck deixa de existir ou mostra
   "indisponível"? b) autor apaga o Deck: a página some. Não definido.
6. **Granularidade do que o Free enxerga** ("sabe que o Deck existe"): nome? autor? nº de Notes? Só o CTA?
7. **Descrição, ícone, cor e "última atualização"** do Deck: AT §18 exige exibi-los, mas não define armazenamento;
   "última atualização" deve ser derivada se possível (AT §39), a decidir o que conta como atualização.
8. **Tag de autoria e unicidade** (7.4): como lidar com usernames que colapsam no mesmo slug.
9. **Visibilidade do Deck de usuário com `public_profile` desligado.**
10. **Reportar** Deck/cartão público: usar Reports existente (AT §37 cita Reports na auditoria); superfície por Deck indefinida.

## 7. Contrato de atribuição (Tag `criado-por-[username]`)
7.1 **Onde vive:** em `tags` da Note (`own_flashcards.tags text[]`), não na CardInstance (inv. 11). Reverse e Cloze
compartilham a tag por serem a mesma Note. Nenhuma coluna `source_*` é requisito.
7.2 **Quando é criada:** no ato da cópia; Notes de Deck público copiado recebem a tag do **autor original**; cópia de
cópia mantém a tag original e não adiciona outra (regra 9).
7.3 **Permanência e proteção (contrato; não implementado):** a tag não pode ser removida, renomeada, apagada nem
recriada manualmente pelo destinatário; distinguir "tag de sistema" por **prefixo reservado `criado-por-`** em
validação servidor (editor, Painel de Tags, RPCs `rename_note_tag`/`delete_note_tag`, UPDATE em `own_flashcards`).
Sem isso, o destinatário (ou qualquer usuário) poderia **forjar** autoria digitando a tag.
7.4 **Achado crítico (C9): a tag não é injetiva.** `normalizeTagSlug` troca tudo fora de `[a-z0-9-]` por `-`, e o
username aceita `[a-z0-9_.-]`. Verificado: `ana.silva`, `ana_silva` e `ana-silva` resultam em
`criado-por-ana-silva`. Dois autores distintos podem gerar a MESMA tag de atribuição. Limite: `criado-por-` (11) +
24 = 35 chars, dentro do máximo de 50. Para o contrato valer ("representa o autor original"), é preciso DECISÃO
(pendente 8): restringir usernames novos, permitir uma normalização específica para a tag de sistema, ou aceitar a
ambiguidade. Também verificar nos dados reais se já há usernames que colidem (consulta somente leitura futura).
7.5 **Editar a cópia:** conteúdo e demais tags são livres (regra 20); a tag de autoria permanece. Editar o
conteúdo incrementa `revision` pela regra existente (AT §28); a tag não é conteúdo editável.
7.6 **Aparece no Painel do usuário:** sim, como tag da Note (AT §10 + §14); bloqueada para remoção/rename.
7.7 **Estabilidade:** só é definitiva com username imutável. Hoje não é.

## 8. Cadeia do username (auditoria, sem correção)
- **Criação:** `profiles.username` único, `check ^[a-z0-9_.-]{3,24}$` (001); gerado/escolhido no onboarding.
- **Edição (conflito):** `saveProfileEdits` (`shared/profile.js`) aceita novo username se disponível; UI
  `profile-edit-username`; no banco **não há trigger/policy** que impeça o UPDATE.
- **Dependem do username:** rota `#/user/<username>` (`router.js`, `public-profile.js`), RPCs públicas por
  `p_username`, vínculos de professora por @username (`admin-students.js`, `roles.js`), Premium por @username
  (`admin-premium.js`), badges (`admin-badges.js`), `flashcard_owner_username` no contexto de Reports, Ranking/links.
- **Persistência histórica:** nenhuma tabela guarda o username antigo; links compartilhados `#/user/old` quebram
  após mudança; Reports já gravados contêm o username da época.
- **Basta bloquear a edição?** Para daqui em diante, sim (UI + trigger no banco, pois só UI não basta). Existentes:
  permanecem como estão (regra 19, sem migração destrutiva). Não há como saber, sem consulta ao banco real, se
  mudanças passadas já deixaram links/Reports órfãos; **não consultado** nesta etapa. Pré-requisito da atribuição,
  não detalhe independente.

## 9. Contrato Free/Premium
| Ator | Vê que o Deck existe | Abre | Importa |
|---|---|---|---|
| Visitante anon | decisão pendente (6.6) | não definido pelo AT (hoje vê perfil sem login) | não |
| Free logado | sim | **não** | **não** |
| Premium logado | sim | sim | sim, de qualquer usuário |
Limite Free (contagem por CardInstance, AT §17): se o Deck criaria N Cards e cabem M<N, cria os **primeiros M**,
informa "Este Deck criaria N Cards, mas sua conta pode possuir apenas M. Por isso, apenas os primeiros M foram
criados.", CTA Premium destacado. Reverse conta 2, Cloze conta N; quando só cabe parte de uma Note multi-Card, a
regra de corte por Note vs por Card **não está definida** (pendente 3-bis, implica não gerar meia Note de forma
silenciosa). Premium não tem esse teto. Vínculo com professora isenta do teto (regra atual, mantida). Duplicatas/semelhantes
não contam como já criadas até o merge decidir.

## 10. Contrato de cópia/importação
Destino: `Idioma > Meus Decks` ou subdeck pessoal escolhido; nunca "Importado". Hierarquia: preservar relativa abaixo
do destino (AT §22). Notes novas Native, IDs novos, FSRS padrão, tags da origem + tag de autoria, mídia por Field.
Reimportação: detectar semelhantes, avisar, oferecer merge; mesmo nome de Deck => "(2)" ou inserir no existente (AT §23).
Atômico quando possível e sempre informado; nunca parte silenciosa.

## 11. Contrato de conteúdo nativo
Qualquer superfície pública lê **Note + Fields + Card Type** (e tags, mídia do Field), não `front/back_trans`.
`get_public_flashcards` hoje viola isso (C2) e **não deve ser a base** de Public Decks; será substituída/reescrita
por projeção nativa. Não expor FSRS, due, N/L/R, `revision`, status, `hidden_from_profile`, Teacher, Study. Nenhuma
nova fonte de conteúdo. Números públicos = **Notes** (AT §18); contagem de CardInstances só para o limite Free.

## 12. Segurança
Filtro no servidor, nunca no front. Resposta idêntica para Deck inexistente/privado/despublicado. Leitura pública
só de `kind='personal'` filho de Meus Decks com `is_public`; trigger deve rejeitar `personal_root`. Import exige
Premium validado no servidor. Tag `criado-por-` protegida no servidor. Username imutável no banco. `grant anon`
restrito a leitura. Mídia: bucket público por URL, publicar expõe as URLs. Enumeração: ids de Deck não devem permitir
sondar privados.

## 13. Ordem final das fases (dependências verificadas)
A ordem da v2 foi **alterada**:
0. Fechar as pendências da seção 6 (subárvore, rota, semelhante/merge, hidden, despublicação, colisão da tag).
1. **Username imutável** (trigger no banco + UI) -- pré-requisito de tudo que cita o autor (tag, URL).
2. **Contrato de tag de sistema + decisão de colisão (7.4)** e proteção `criado-por-` (editor, Painel, RPCs).
   Antes de qualquer importação, senão há janela de forjar autoria.
3. **Projeção nativa pública** (RPC de leitura por Note) -- antes da publicação, senão a página mostra conteúdo errado.
4. **Publicação de Deck:** metadados (descrição, ícone, cor), restringir trigger a `personal`, RPC de leitura por
   Deck, rota, despublicar. Segurança (seção 12) entregue junto, não depois.
5. **Importação Premium** com gate no servidor, destino, corte parcial informado (e alinhar o corte no
   Anki/arquivo quando fizer sentido).
6. **Semelhantes + merge** (depende do algoritmo decidido).
7. **Perfil mostra Decks públicos**; destino de `hidden_from_profile`.
8. **K.8.**
(XP/streak/progresso: sem fase própria, decisão 5.1.)

## 14. Matriz de testes (futuros)
**Publicação:** só Meus Decks; `personal_root` rejeitado; Course/Teacher/raiz rejeitados; subárvore conforme regra
definida; publicar/despublicar; mover/excluir Deck público; rota pública.
**Visibilidade:** anon, Free, Premium; privado = inexistente; arquivado fora; conteúdo de outra origem nunca;
campos nativos; mídia.
**Conteúdo:** Normal, Reverse (2 Cards/1 Note), Type Answer, Cloze (N/1), MC, áudio, imagem, Tags dentro do Card
e ausentes do cabeçalho.
**Atribuição:** `criado-por-` correta; username imutável (UI e banco); colisão `ana.silva/ana_silva`; forjar tag
manual rejeitado; Painel não renomeia/apaga; cópia independente; editar original; editar cópia; despublicar;
excluir; cópia de cópia mantém só a original; reimportação; semelhantes; merge.
**Limites:** Free x Premium; corte parcial e mensagem; Reverse; Cloze; Note multi-Card no limite; atomicidade;
nunca acima do limite.
**Segurança:** RLS/RPC com papéis reais; acesso direto por id; enumeração; vazamento de privado, Teacher, Study,
FSRS; Premium forjado; `anon`.
**Regressão:** Review, Preview, Anki import/export, Painel de Tags, Perfil Público.

## 15. Condições para desbloquear K.8
Concluídas: fases 1-5 e 7 da seção 13 (username imutável, tag protegida, projeção nativa, Decks públicos com
segurança, importação, perfil mostrando Decks públicos); pendências 6.2 (subárvore), 6.5 e 6.7 fechadas, pois
definem o universo e a unidade da contagem; contagem pública por **Notes**. K.8 não usa FSRS e não reutiliza
`analytics-metrics.js` indiscriminadamente. `source_*` nunca é pré-requisito.

## 16. Pendências carregadas para a auditoria final
- K.7: a fronteira real da lição e o texto real do banner de revisão **não** foram validados em browser (só
  evidência indireta por fórmulas).
- Migration **059 NÃO aplicada**; deve ser aplicada em produção **antes** de publicar o front da K.6/K.7.
- `notification-cron` (K.0-C) **NÃO deployado**.
- SQL de K.0/K.6 validado só em Postgres local com schema mínimo, nunca no Supabase real.
- Divergências abertas: username editável (C1), "Arquivados" (C8), colisão da tag de autoria (C9).
