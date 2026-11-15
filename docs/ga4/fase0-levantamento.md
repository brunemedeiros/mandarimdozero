# GA4 + banner de cookies: Fase 0 (levantamento)

Feito em 2026-11-15, sem alterar código. Decisões da dona e pontos em aberto: `docs/historico/35-google-analytics-consentimento.md`.

## 1. Páginas e onde o GA4 e o banner entram

Tudo fica no mesmo endereço (`app.profbrune.com.br`), então uma escolha no banner vale para o site inteiro.

| Página | Idioma | O que é | GA4 | Banner | Observação |
|---|---|---|---|---|---|
| `/` (`index.html`) | pt-BR ou en (menu de idioma) | Entrada, cadastro, "Eu falo..." | sim | sim | Recebe `#access_token=` (link de login), `?convite=`, `?level_test_offer=`, `?ui=`. Carrega Nunito do Google Fonts (ver 2.3) |
| `/fr/`, `/zh/` (e o futuro `/pt/`) | idioma do site (`ui-language`) | App de estudo, com login | sim | sim | App de uma página só: a troca de tela não muda o endereço. Admin e Painel da Professora fora |
| `/sobre.html` | pt e en na mesma página (`#pt`, `#en`) | Sobre | sim | sim | Já tem rodapé |
| `/privacidade-login.html`, `/privacidade-google-agenda.html`, `/privacidade-notion.html` | pt e en na mesma página | Privacidade de cada conexão | sim | sim | Sem rodapé hoje |
| `/teste-de-nivelamento-fr/` | pt-BR | Moldura do Apps Script | sim (só a moldura) | sim | Repassa todos os parâmetros do link ao Apps Script (`?origem=` continua igual) |
| `/teste-de-nivelamento-pt/` | **en** | Moldura do Apps Script | sim (só a moldura) | sim, em inglês | Idem |
| `/contrato/` | pt-BR | Moldura do Apps Script | **proposta: não** | não | Quem abre já é aluno fechando contrato; o link pode levar dados no endereço (repassa `location.search` inteiro) |
| `/ajuda/` | pt-BR | Central de Ajuda (rascunho, `noindex`) | **proposta: não, até ser pública** | não | Hoje só o advogado lê |
| `shared/offline.html`, `shared/painel/guia-de-estilo.html` | | Tela sem internet, guia interno | não | não | |
| `agenda.profbrune.com.br`, `profbrune.com.br` | | Fora do app | não | não | Decisão da dona: só o app por enquanto |

**Dentro do app**: o comum é medir só a entrada (1 visita por carregamento, com a origem do UTM) e deixar o detalhe das telas
com a medição própria que já existe (`usage_events`, que vê Trilha, Revisão, Desafios etc.). Medir cada tela no GA4 também é
possível ("páginas virtuais"), mas duplica o que o Analytics do Admin já mostra. **Proposta: só a entrada.**

## 2. O que o site já guarda no navegador

Levantamento completo (arquivo e linha de cada chave): feito por subagente em 2026-11-15. Resumo:

- **Não há nenhum cookie** hoje (`document.cookie` não aparece no código), nem IndexedDB, nem medição de terceiros.
- **localStorage e sessionStorage** (memória do navegador, que fica no aparelho e não é enviada a ninguém sozinha): ~35 chaves.

### 2.1 Necessário (não precisa de consentimento)

- Login: `sb-eigjocalzwamisgqilhg-auth-token` (sessão do Supabase), `guest_mode`, `pendingRouteAfterLogin`, `signup-intent`,
  `pendingFriendInvite`, `pendingClassroomCode`, `pendingTeacherInvite`, `course-restart-signal`, `course-restart-done`.
- Idioma e tema: `ui-language`, `ui-language-gate`, `last_language`, `app_theme`.
- Segurança e suporte: `report_guest_id`, `report_last_submit`, `report_guest_submits`.
- Funcionamento sem internet: cache do service worker (`frances-avec-prof-brune-<versão>`, cópia dos arquivos do próprio site).
- A própria escolha do banner (chave nova, ex.: `cookie-consent`).

### 2.2 Preferências que a pessoa escolheu (também sem consentimento)

O subagente marcou estas como "opcionais", mas as orientações de privacidade costumam tratar **preferência que a própria pessoa
escolheu com um clique** como necessária para atender ao pedido dela: som de acerto, pinyin escondido, trilha em lista ou mapa,
menu recolhido, faixa de Desafios recolhida, áudio automático dos diálogos, convite de notificação adiado, última posição no
Ranking, último lembrete de estudo, estado das telas do Banco de Revisão. **Proposta: não entram no banner**, só são citadas na
política. Assim o banner tem uma escolha só (Google Analytics sim ou não), sem lista de categorias.

### 2.3 Achados

- **Google Fonts na página de entrada** (`index.html:10-12`): o Google recebe o endereço de IP de quem abre a página antes
  de qualquer escolha. Em `/fr` e `/zh` a Nunito já vem de `shared/fonts/`. Proposta para a Fase 3: usar a fonte local também na
  entrada. Assim nenhum terceiro recebe dados antes do "Aceitar".
- **Medição própria** (`shared/analytics.js`, tabela `usage_events`): não usa cookie nem localStorage, só conta logada, sem
  admin. Não entra no banner, mas a política de cookies deve citar que existe (e a política geral já fala de dados de uso).
- **jsdelivr e cdnjs** (bibliotecas do app) recebem IP e navegador de quem abre `/fr` e `/zh`, como qualquer servidor. Citar na política.

### 2.4 Cookies que o GA4 vai criar (só depois do "Aceitar")

| Cookie | Para quê | Duração padrão | Proposta |
|---|---|---|---|
| `_ga` | Reconhecer o mesmo navegador entre visitas (número aleatório) | 2 anos | 13 meses |
| `_ga_<ID>` | Guardar o estado da visita atual | 2 anos | 13 meses |

## 3. Páginas de privacidade

Hoje existem três páginas específicas (Entrar com Google, Google Agenda, Notion), cada uma com pt e en na mesma página (`#pt` e
`#en`). A política geral é rascunho só em pt-BR (aba Privacidade do Admin e `/ajuda/`), com o advogado.

**Proposta (opção B, já decidida):** página nova `/privacidade-cookies.html`, no mesmo molde das três (pt e en na mesma página,
o banner do site em inglês leva direto a `#en`). Conteúdo: o que é guardado (2.1 e 2.2 em linguagem simples), os cookies do GA4
(2.4), o Google como fornecedor e o envio de dados para fora do Brasil, como aceitar, recusar e mudar depois, direitos pela
LGPD, contato `contato@profbrune.com.br`. A mesma seção vai para o rascunho da política geral do advogado.

Onde entra o link: rodapé de `sobre.html` e das três páginas de privacidade (que ganham rodapé), um link discreto na entrada,
Configurações do app ("Preferências de cookies") e o próprio banner.

## 4. Onde aparece "sem telemetria de terceiros"

| Lugar | O que fazer (Fase 3) |
|---|---|
| `shared/analytics.js:41` (comentário) | Atualizar: medição própria sem biblioteca; GA4 separado, com consentimento |
| `shared/i18n/pt-BR.js:1979` e `shared/i18n/en.js:1961` (`admin.analytics.dev.osNote`) | Tirar "sem telemetria de terceiros", nas duas línguas |
| `docs/i18n/traducoes-en-pendentes.md:1468`, `docs/i18n/etapa4-auditoria-escrita.md:560` | Não mudar: são registros de época |
| `CLAUDE.md` | Já trocado pela regra "Google Analytics 4 com consentimento" |

## 5. Rascunho do banner

Barra fixa embaixo da tela, sem cobrir botões do app no celular. Dois botões do mesmo tamanho e da mesma cor de borda (nenhum em
destaque), nada marcado de antemão, e o site funciona normalmente enquanto a pessoa não escolhe.

**pt-BR (modo básico)**
> Usamos cookies do Google Analytics para saber quantas pessoas visitam o site e de onde elas vêm. Só ativamos se você aceitar.
> [Política de cookies]
> [Recusar] [Aceitar]

**en (modo básico)**
> We use Google Analytics cookies to count visits and see where visitors come from. They only turn on if you accept.
> [Cookie policy]
> [Decline] [Accept]

Se a dona confirmar o modo avançado, a segunda frase muda, porque deixaria de ser verdade:
> pt-BR: "Se você recusar, nenhum cookie é guardado, mas o Google ainda recebe um sinal da visita, sem cookie."
> en: "If you decline, no cookies are stored, but Google still receives a signal of the visit, without cookies."

## 6. Plano das próximas fases (ajustado)

- **Fase 1** (manual, da dona): conta, propriedade e fluxo de dados no GA4, privacidade (14 meses, Sinais do Google desligados,
  sem anúncios personalizados); termina com o ID `G-...`.
- **Fase 2**: `/privacidade-cookies.html` (pt e en), seção no rascunho do advogado, links nos rodapés.
- **Fase 3**: banner + GA4 em `shared/` (vale para fr, zh e o futuro pt); só a entrada no app; endereço limpo (só caminho +
  `utm_*`; convite, token e outros parâmetros nunca saem); sem admin e sem professora no Painel; "Não contar este aparelho";
  UTM guardado na chegada para não se perder quando a pessoa aceita depois de trocar de página; fonte local na entrada;
  textos "sem telemetria"; testes e prints (pt-BR e en, claro e escuro, celular e computador); lista de arquivos do cache
  do service worker atualizada.
- **Fase 4**: publicar e conferir ao vivo (Tempo real e link com `utm_source=teste`).
- **Fase extra** `/aulas/`: depois da Fase 4 (ver o histórico 35).
- **Fase 5** (opcional): eventos-chave.

Grátis x Premium: não se aplica a contas (é medição do site). Banner e política valem igual para todos.
