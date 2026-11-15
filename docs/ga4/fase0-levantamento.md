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
possível ("páginas virtuais"), mas duplica o que o Analytics do Admin já mostra. ~~Proposta: só a entrada.~~

**Decisão da dona (2026-11-15): medir mais, tudo de uma vez se der.** Dá, porque o app já avisa a medição própria nesses
momentos (`trackEvent` em `shared/analytics.js`); o GA4 recebe uma cópia, por uma lista fechada de nomes. Proposta para aprovar:

| No GA4 | Vem de | Detalhe enviado |
|---|---|---|
| Página virtual por aba (Estudo, Revisão, Desafios, Conjugação, Decks, Amigos, Ranking, Perfil, Configurações) | `tab_switch` (`shared/tabs.js:40`) | Só o nome da aba. Admin e Professora nunca |
| `sign_up` (criou conta), evento-chave | cadastro concluído (ponto a localizar na Fase 3) | Curso e idioma do site |
| `lesson_start` e `lesson_complete` | `trackEvent('lesson_start'/'lesson_complete', tipo)` | Tipo (lição, revisão, desafio, ditado, conjugação, jogo) e curso |
| `course_restart` | `shared/recomecar-curso.js:224` | Curso |
| Clique para o formulário de aulas ou WhatsApp, evento-chave | medição automática de links de fora | Endereço de destino |
| Abrir teste de nivelamento, evento-chave | visita a `/teste-de-nivelamento-*` | Idioma do teste |

Fica de fora: cada resposta da Revisão (`review_answer`, são centenas por dia), erros técnicos, tempo de carregamento,
relatos de problema. Nunca: nome, e-mail, @, id da conta, texto de cartão.

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

**Opção genérica** (pedido da dona, 2026-11-15, nos moldes dos banners da Speakly e de outros sites de idiomas):
> pt-BR: "Usamos cookies para o site funcionar e, se você permitir, para entender como ele é usado. [Política de cookies]"
> [Recusar opcionais] [Aceitar todos]
>
> en: "We use cookies to make the site work and, if you allow it, to understand how it is used. [Cookie policy]"
> [Reject optional] [Accept all]

Mais 3 propostas genéricas (2026-11-15), nos moldes das referências da dona:

- **G1, cartão no canto** (como a Memrise, mas com Recusar):
  > pt-BR: "Este site usa cookies e tecnologias parecidas para funcionar e, com a sua permissão, para medir as visitas. Para saber mais ou mudar sua escolha depois, veja a nossa [Política de cookies]." [Recusar] [Aceitar]
  > en: "This site uses cookies and similar technologies to work and, with your permission, to measure visits. To learn more or change your choice later, see our [Cookie policy]." [Decline] [Accept]
- **G2, barra embaixo com título** (como a Speakly):
  > pt-BR: **"Sua privacidade importa"** "Usamos cookies para melhorar a sua experiência e entender como o site é usado. Os opcionais só entram se você aceitar. [Política de cookies]" [Recusar opcionais] [Aceitar todos]
  > en: **"We value your privacy"** "We use cookies to improve your experience and understand how the site is used. Optional ones only turn on if you accept. [Cookie policy]" [Reject optional] [Accept all]
- **G3, uma linha só** (como a terceira referência):
  > pt-BR: "Este site usa cookies para melhorar a sua experiência e medir as visitas. [Política de cookies]" [Recusar opcionais] [Aceitar todos]
  > en: "This site uses cookies to improve your experience and measure visits. [Cookie policy]" [Reject optional] [Accept all]

Cuidado comum às três: "melhorar a sua experiência" sozinho é vago. As orientações da ANPD pedem que o aviso diga para que serve,
por isso todas citam "medir as visitas" ou "entender como o site é usado".

Regras para qualquer versão: os dois botões do mesmo tamanho e estilo. Não ter só "Concordo" (o modelo da Memrise não deixa
recusar). Sem botão "Personalizar" enquanto houver uma única categoria opcional (abriria uma tela com uma chave só). Não citar
anúncios (o site não usa). O banner aparece só na primeira visita; a escolha fica guardada no aparelho e só volta a ser pedida
em navegador ou aparelho novo, depois de limpar os dados do navegador, ou se a política mudar de verdade (versão da escolha).

Modo avançado: descartado pela dona em 2026-11-15 (ver histórico 35).

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

## 7. O que entrou além do prompt original (comparação de 2026-11-15)

Já no plano e não no prompt: endereço limpo antes de enviar (convite, token), fonte local na entrada, UTM guardado na chegada,
"Não contar este aparelho", Contrato e Central de Ajuda fora, página `/aulas/`, idade mínima (advogado).

Faltava nos dois, proposto para a Fase 3:
- **Teste automático "recusar = zero pedidos ao Google"**: o navegador de teste abre as páginas, recusa, navega e falha se houver
  qualquer pedido a `google-analytics.com` ou `googletagmanager.com`. Outro teste confere que antes de escolher também é zero.
- **Painel da Professora fora**, igual ao de Admin (ferramenta de trabalho, não visita).
- **Versão da escolha**: o banner volta só se a política mudar de verdade.
- **Medição automática do GA4** ("medição otimizada": rolagem, cliques em links de fora, buscas, downloads): proposta deixar
  ligados só os cliques em links de fora (mostra quem vai para o formulário de aulas ou o WhatsApp) e desligar o resto.
- **Pedidos de exclusão pela LGPD**: a política diz que, como o GA4 não guarda nome nem e-mail, a pessoa apaga os próprios
  dados do GA4 limpando os cookies do navegador, e que os dados somem sozinhos depois de 14 meses.

Grátis x Premium: não se aplica a contas (é medição do site). Banner e política valem igual para todos.
