# Histórico: Google Analytics 4 com consentimento

## Decisão (dona do projeto, 2026-11-13 e 2026-11-14)

Substitui a decisão antiga de fazer o site "sem telemetria de terceiros" (comentário em `shared/analytics.js` e texto
`admin.analytics.dev.osNote` em `shared/i18n/pt-BR.js` e `en.js`). Esses dois textos só mudam na Fase 3 (instalação);
até lá o código ainda diz "sem telemetria de terceiros".

- **Ferramenta**: Google Analytics 4, para saber quantas pessoas visitam o site e de onde vêm (links com UTM, ex.:
  `?utm_source=instagram&utm_medium=bio`). A dona aceitou que o GA4 vai subcontar, porque parte das pessoas recusa o banner.
- **Onde**: só em `app.profbrune.com.br`, nas páginas abertas (início, sobre, ajuda, testes de nivelamento, contrato,
  páginas de privacidade, tela de entrar) **e dentro do app** (fr, zh e o futuro pt). Os testes e o contrato são molduras
  do Apps Script: o GA4 mede a moldura, não o formulário. `profbrune.com.br` e `agenda.profbrune.com.br` ficam de fora por enquanto.
- **Consentimento: modo BÁSICO, confirmado pela dona em 2026-11-15** depois do alerta abaixo (rever quando o site crescer).
  Histórico da escolha: em 2026-11-14 ficou o básico (o código do Google só é baixado depois do "Aceitar";
  sem aceite, nada vai para o Google). Em 2026-11-15 a dona pediu o avançado ("quero estimativas melhores"). Alerta dado a
  ela: a estimativa do Google só liga com pelo menos 1.000 usuários por dia que aceitaram (em 7 dos últimos 28 dias) e
  1.000 eventos por dia de quem recusou (por 7 dias); o app logado teve média de 2 usuários por dia (máximo 7) nos 28 dias
  até 2026-11-15 (`usage_events`, produção). Sem atingir esse volume, o avançado manda ao Google dados de quem recusou sem
  dar estimativa nenhuma. Até ela confirmar, vale o básico. Nos dois modos: "Aceitar" e "Recusar" com o mesmo destaque,
  escolha guardada e link "Preferências de cookies" no rodapé.
- **Política**: opção B. Uma "Política de cookies" curta e separada, em pt-BR e en, publicada junto com o GA4. A mesma
  seção entra no rascunho da política geral (aba Privacidade do Admin e `ajuda/textos/politica.html`), que segue só em
  pt-BR até o advogado fechar; quando fechar, as duas se juntam.
- **Sem dados pessoais no Google**: nada de nome, e-mail ou id. Limpar o endereço antes de enviar (`?convite=`,
  `#access_token=`, `#error=` e outros parâmetros que não sejam UTM). Não medir o Painel de Admin nem a atividade da dona.
  Nas páginas abertas ela não está logada: prever um "Não contar este aparelho".
- **Links `?origem=` dos testes**: continuam como estão (a planilha do Apps Script depende deles). A moldura repassa todos
  os parâmetros, então os `utm_` também chegam à planilha. Pendência futura: migrar os `?origem=` para UTM.

## Respostas da dona em 2026-11-15 (Fase 0)

- Contrato (`/contrato/`) **fora** do GA4. Central de Ajuda (`/ajuda/`): **pendência**, ligar o GA4 quando ficar pública.
- Painel de Admin e Painel da Professora **fora** da medição.
- No app ela quer medir mais (telas e ações), mesmo repetindo o Analytics do Admin, para ter tudo num lugar só; se der,
  tudo de uma vez na Fase 3 (lista de telas e ações aguarda aprovação dela).
- Privacidade por padrão + caixinha de idade no cadastro (sugestões 1 e 2): ela pediu para aplicar e, depois de aplicado,
  registrar no documento do advogado que já existem. Antes, levantamento do que muda para quem já usa.
  Levantamento (2026-11-15): conflita com a decisão dela da migration `041_public_profile_default_true.sql` (perfil público
  por padrão, inclusive contas antigas). Hoje: perfil nasce público; toda conta com XP entra no Ranking Geral (sem opção de
  sair); Amigos com busca por nome, sugestões automáticas (`suggest_me`), pedidos (`accept_requests`), cutucar e missão em
  dupla automática, tudo ligado por padrão (`friend_settings`); cadastro sem caixinha de idade, e o Google pula o passo 3.
  Opções A (tudo protegido para todos), B (só contas novas, Ranking e Amigos desligados) e C (contas novas com perfil
  privado, Ranking e Amigos ligados) apresentadas a ela; aguarda escolha.

## Fase 0 aprovada (2026-11-15)

- Banner: **G3, uma linha só** ("Este site usa cookies para melhorar a sua experiência e medir as visitas. [Política de
  cookies]" [Recusar opcionais] [Aceitar todos]). A frase "Ao clicar em Aceitar, você concorda..." não é necessária: o
  clique já é o consentimento.
- Lista de medições do app (telas, ações e eventos-chave de `docs/ga4/fase0-levantamento.md`, seção 1): aprovada, vai
  toda na Fase 3.
- Privacidade por padrão: **opção C** (contas novas nascem com perfil privado; Ranking e Amigos continuam ligados; contas
  antigas não mudam) + caixinha de idade. Feita nesta conversa logo depois da Fase 0, como **Fase P**.
- Fase 6 (`/aulas/`): **moldura** com o formulário dentro, resposta marcada pelo `utm_source`, só o formulário de francês.
- Idiomas do banner e da política: pt-BR e en (o espanhol está congelado e fora do menu de idioma).

## Fase P (privacidade por padrão, opção C)

- 2026-11-15: migration `136_privacy_default_and_age_ack` (contas novas com `public_profile = false`; contas antigas não
  mudam; `profile_private.age_ack_at` + `ack_my_age()`) aplicada no **Staging** (versão `20261115211611`; conferido: padrão
  false, 4/4 perfis antigos continuam públicos, anon não executa). **Produção: aplicada em 2026-11-15 com autorização da dona**
  (versão `20261115213809`; hash dos 39 perfis `02439bc3a9c1c1d410595cb39786fe4f` igual antes e depois, 39/39 públicos).
- Cadastro, passo 2: caixinha obrigatória ("Tenho 18 anos ou mais, ou tenho autorização do meu responsável para usar o
  site." / "I'm 18 or older, or I have my parent or guardian's permission to use the site."); sem marcar, Google e e-mail
  ficam travados; a data é gravada depois do login (`afterAuthResolved`). Testes: `tests/privacidade-padrao/run.sh` 8/8,
  `tests/login-obrigatorio/test_entrada_idioma.js` 162/162, `test_playwright.js` 124/124, `tests/cores-marca/test_portao.js` 6/6.
- Contas que já existem (e conta nova criada pelo "Entrar com Google" da tela de Entrar, que não passa pelo passo 2): primeiro
  a opção A (faixa no topo do Estudo); depois a dona escolheu a **"A1 nova"** (2026-11-15): janela no estilo das janelas do
  topo (classes `tpop-*`), ao abrir o site, com a caixinha, "Agora não" (fecha nesta visita, volta na próxima; Esc também) e
  "Confirmar" (travado até marcar). `shared/age-ack.js` e `.css`, fr e zh; professora e admin dispensadas. Teste
  `tests/privacidade-padrao/test_janela_idade_playwright.js` 42/42.

## Estilo do banner de cookies (pedido da dona, 2026-11-15)

"Recusar opcionais" à esquerda e "Aceitar todos" à direita, no estilo da tela do próprio Google que ela mostrou: os dois botões
do mesmo tamanho e com borda; o texto de "Aceitar todos" na cor da marca (azul no fr, vermelho no zh) e o de "Recusar
opcionais" em cinza. Fundo cheio colorido só no "Aceitar" foi desaconselhado (empurra a pessoa a aceitar, contra a orientação
da ANPD e o pedido do prompt). Aguarda o "ok" dela.

GA4 (Fase 1): desmarcar "Alterações na página de acordo com os eventos do histórico de navegação" e deixar "Carregamentos de
página" (o site manda as telas do app sozinho; com isso ligado, as limpezas de endereço do site contariam visitas a mais).

## Escolhas de 2026-11-15 (terceira rodada)

- Banner de cookies: **B1 nova** (janela no estilo das do topo, título "Cookies", botões "Recusar opcionais" e "Aceitar
  todos" iguais). Pergunta dela: por que não tem "Personalizar/Preferências" como outros sites. Resposta: aqueles sites
  têm várias categorias opcionais (funcionais, desempenho, anúncios); o dela tem uma só (medição), então a tela de
  preferências repete a escolha do banner. Proposta enviada com prévia: link discreto "Preferências" no banner abrindo uma
  janela com "Necessários (sempre ativos)" e "Medição de visitas" (chave), que é a mesma janela do "Preferências de
  cookies" do rodapé, pedida no prompt. Aguarda o ok dela.
- GA4: anúncios desligados em todas as regiões (conferido por ela). Vinculações: conferir que não há nada vinculado.
  Filtros de dados: o GA4 já cria o filtro "Tráfego interno" em modo de teste, que não faz nada sem regras; deixar como está.

## Fase 1 (2026-11-15)

- ID da métrica do GA4: **`G-CE3282C1FB`** (público por natureza: aparece no código de qualquer site que usa o GA4). O ID do
  fluxo não é necessário. Falta a dona confirmar a parte B (14 meses, Sinais do Google desligados, anúncios desligados) e
  escrever "Fase 1 aprovada".

## Prévias pedidas em 2026-11-15 (aguardam escolha)

- Confirmação de idade com mais destaque: A1 janela ao abrir com "Agora não" (volta na próxima visita), A2 janela
  obrigatória (só some confirmando; "Sair da conta"), A3 faixa colorida no topo. Antes ela tinha preferido não ter janela
  única; a janela volta agora a pedido dela.
- Banner de cookies: B1 botões iguais, só o texto de "Aceitar" na cor da marca; B2 "Aceitar" cheio na cor da marca (azul no
  fr, vermelho no zh); B3 "Aceitar" cheio em cor neutra (tinta escura, igual nos dois sites). Dúvida da dona: vermelho no zh
  parecer "cancelar". Nota: no zh todos os botões principais já são vermelhos ("Começar", "Continuar").
- 2026-11-15, segunda rodada (pedido da dona: janelas no estilo das janelas do topo 🔥 e ⭐, `shared/janelas-topo.css`,
  classes `tpop-*`): A1 nova e A2 nova (cabeçalho na cor da marca com título grande e 🙋, caixinha num cartão, "Confirmar"
  em pílula com borda), A3 mantida; B1 nova (cabeçalho "Cookies" com 📊, botões iguais) e B2 nova ("Aceitar todos" cheio
  na cor da marca), B1/B2 antigas e B3 mantidas como opção. Prévias geradas na tela real do app (fr e zh, claro e escuro).
- GA4: não clicar em "Confirmação de coleta de dados do usuário / Eu confirmo" (é para quem manda e-mail ou telefone ao
  Google; o site não manda dado pessoal). "Coleta de dados do dispositivo e local granular" (cidade e modelo do aparelho,
  sem guardar o IP) pode ficar ligada; a política cita. "Personalização de anúncios": desligada para todas as regiões.

## Fase extra (depois da Fase 4): página `/aulas/`

Nova versão do prompt (2026-11-15) chama de **Fase 6**: link geral https://forms.gle/9994D2GHdwDj4RyT7 (formulário de aulas
de francês); avaliar redirecionar x moldura com o formulário dentro (sugestão dela, para o banner aparecer); marcar a
resposta pelo `utm_source` é opcional e precisa de confirmação dela.

Pedido da dona (2026-11-15): `app.profbrune.com.br/aulas/` lê o `utm_source` e redireciona para o formulário de aulas do
Google Forms com a pergunta "Como conheceu a Prof. Brune?" (campo `entry.1856921042`) já marcada: `instagram` → "Instagram
@prof.brune", `tiktok` → "TikTok", `indicacao` → "Indicação de amigo, familiar ou aluno", `mundolingo` → "Mundo Lingo",
`pessoal` → "Perfil pessoal da Brune (Instagram ou outra rede)"; sem utm (ou valor desconhecido) → formulário sem opção
marcada. O GA4 registra a visita antes de redirecionar. Atenção: quem chega por esse link é redirecionado sem ver o banner,
então no modo básico essa visita não chega ao GA4 (a origem fica registrada na resposta do formulário).

## Pontos em aberto

- **Idade mínima**: a dona não tem alunos menores nas aulas, mas o cadastro do site não pergunta a idade, e nem os Termos
  nem a política em rascunho falam de idade mínima. Ideia dela (2026-11-15): aceitar menores com a ciência dos responsáveis,
  sem perguntar a idade. Levar ao advogado: LGPD art. 14 e o ECA Digital (Lei 15.211/2025, em vigor desde 2026-03-17, que
  não aceita a autodeclaração como único meio de saber a idade), ainda mais porque o site tem Amigos, Ranking e perfil público.

- **Levar ao advogado**: os pontos do GA4, da medição própria e da idade mínima estão na seção "Novos pontos de 15/11/2026"
  da aba Resumo do documento do advogado (https://claude.ai/artifact/GCZFie5fbCT2rKW4nKUfuq).

## Andamento

- 2026-11-14: decisão registrada. Fase 0 (levantamento) ainda não começou. Plano completo das fases: prompt da dona
  (Fases 0 a 5, aprovação "Fase N aprovada" entre elas; nada vai para a `main` sem aprovação).
