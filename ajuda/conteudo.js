// Central de Ajuda (RASCUNHO, 2026-10-30): conteúdo da página ajuda/index.html.
// Modelo: perguntas curtas (estilo Duolingo) que abrem uma resposta de 2 a 4 linhas e levam, em "Ver mais", ao texto completo
// (estilo Memrise: artigo com "Artigos nessa seção" e "Artigos relacionados"). Os textos completos jurídicos ficam em
// ajuda/textos/*.html e serão substituídos pelo texto final do advogado. Guia de escrita: docs/ajuda-central-guia-de-escrita.md.
// `revisar: true` = a resposta curta depende de um ponto [CONFIRMAR] do rascunho; reescrever depois do texto do advogado.
// Só em português por decisão da dona (2026-10-30): a versão em inglês nasce depois do texto do advogado.
const AJUDA = {
  atualizado: '30 de outubro de 2026',
  // Categorias que não têm nenhuma pergunta ficam escondidas (Estudo e Planos entram quando houver conteúdo e, no caso dos planos, cobrança).
  categorias: [
    { id: 'primeiros-passos', titulo: 'Primeiros passos', resumo: 'Criar a conta e entrar no site' },
    { id: 'conta', titulo: 'Conta e perfil', resumo: 'Seu perfil, quem vê seus dados e como excluir a conta' },
    { id: 'professora', titulo: 'Professora e turmas', resumo: 'O que sua professora vê e como a agenda funciona' },
    { id: 'estudo', titulo: 'Estudo e revisão', resumo: 'Lições, cartões e revisões' },
    { id: 'planos', titulo: 'Planos e pagamentos', resumo: 'Grátis, Premium, cancelamento e reembolso' },
    { id: 'problemas', titulo: 'Problemas técnicos', resumo: 'Como pedir ajuda' },
    { id: 'dados', titulo: 'Dados, privacidade e termos', resumo: 'Termos e Condições, Política de Privacidade e o que o site guarda' },
  ],
  // Cada pergunta: curta = resposta simples (2 a 4 linhas); artigo = slug do texto completo (opcional); ancora = id da seção no artigo.
  perguntas: [
    { cat: 'primeiros-passos', q: 'Posso entrar com a minha conta Google?', curta: 'Pode. O Google envia só o seu nome, o seu e-mail e a sua foto de perfil. O site não lê seus e-mails, arquivos, contatos nem a sua agenda.', artigo: 'entrar-com-google' },
    { cat: 'primeiros-passos', q: 'Quais dados o site pede quando eu crio a conta?', curta: 'E-mail, senha, nome de exibição e nome de usuário (@). Foto, país, gênero e apresentação são opcionais, e você escolhe se aparecem para outras pessoas.', artigo: 'politica', ancora: 'como-pedir-os-dados-de-alguem-e-como-atender-um-pedido', revisar: true },
    { cat: 'conta', q: 'Quem vê o meu nome e o meu @?', curta: 'Seu nome, seu @, seus pontos e suas conquistas aparecem no ranking e em Amigos, conforme a configuração do seu perfil. Com o perfil privado, foto, apresentação, progresso e Decks ficam escondidos de quem não é seu amigo nem sua professora.', artigo: 'politica', ancora: '5-quem-mais-ve-seus-dados' },
    { cat: 'conta', q: 'Como excluo a minha conta?', curta: 'Em Configurações, na aba Geral, use "Excluir minha conta". Isso apaga o seu progresso, os seus cartões, o que a professora guardou sobre você, as suas fotos e arquivos. Contas de professora ainda não podem ser excluídas por aqui: peça por e-mail.', artigo: 'politica', ancora: '7-por-quanto-tempo-guardamos' },
    { cat: 'conta', q: 'Como peço os meus dados?', curta: 'Escreva para contato@profbrune.com.br. A gente confirma que é você pelo e-mail da conta, reúne os seus dados e responde.', artigo: 'politica', ancora: '8-seus-direitos', revisar: true },
    { cat: 'conta', q: 'Como deixo de usar o login com Google?', curta: 'No Google, em myaccount.google.com/permissions, remova o acesso de "Idiomas com Prof. Brune". Depois disso você ainda pode entrar com e-mail e senha.', artigo: 'entrar-com-google', ancora: 'como-apagar' },
    { cat: 'professora', q: 'O que a minha professora vê sobre mim?', curta: 'Se você tem vínculo com ela, ela vê o seu progresso de estudo, os cartões que preparou para você e quais você acertou ou errou. Ela não vê a sua senha nem os seus outros dados privados.', artigo: 'politica', ancora: '3-o-que-sua-professora-ve' },
    { cat: 'professora', q: 'As anotações privadas da professora aparecem para mim?', curta: 'Não. As notas privadas que ela escreve sobre as aulas não aparecem para você.', artigo: 'politica', ancora: '3-o-que-sua-professora-ve' },
    { cat: 'professora', q: 'O que acontece quando o vínculo com a professora termina?', curta: 'Ela deixa de ver novas respostas suas. O que ela continua vendo do seu histórico ainda está sendo definido.', artigo: 'politica', ancora: '3-o-que-sua-professora-ve', revisar: true },
    { cat: 'professora', q: 'Ainda não tenho conta. A professora guarda dados meus?', curta: 'Ela pode guardar o seu nome, palavras e frases tiradas das aulas e as respostas que você deu em aula, para montar as suas revisões.', artigo: 'politica', ancora: '24-pessoas-que-ainda-nao-tem-conta', revisar: true },
    { cat: 'professora', q: 'Como a professora conecta o Google Agenda?', curta: 'A conexão é opcional e só de leitura: o site lê os eventos das agendas que ela escolher para registrar as aulas com o dia e o horário certos. Ele nunca cria, muda nem apaga nada na agenda.', artigo: 'google-agenda' },
    { cat: 'professora', q: 'Como a professora desconecta o Google Agenda?', curta: 'Em Professora > Aulas > Calendário > Google Agenda > Desconectar. Isso apaga a chave de acesso, a lista de agendas e os eventos guardados. As aulas já registradas continuam no histórico.', artigo: 'google-agenda', ancora: 'como-desconectar-e-apagar' },
    { cat: 'problemas', q: 'Como peço ajuda quando algo dá errado?', curta: 'Envie um pedido de ajuda pelo site. Você escreve o que aconteceu, pode juntar uma captura de tela e, se quiser resposta, informa o seu e-mail.', artigo: 'politica', ancora: '21-para-todas-as-contas' },
    { cat: 'dados', q: 'Onde posso ler os Termos e a Política completos?', curta: 'Os dois textos completos ficam nesta Central, na categoria "Dados, privacidade e termos". Eles estão em revisão e serão publicados quando ficarem prontos.', artigo: 'termos' },
    { cat: 'dados', q: 'Uma inteligência artificial lê as anotações das aulas?', curta: 'Sim. A professora anota as aulas em documentos dela, e uma ferramenta de inteligência artificial lê esses documentos e a agenda dela toda madrugada para montar cartões de revisão. Assuntos pessoais ou delicados não viram cartão sozinhos: ficam separados para a professora decidir.', artigo: 'politica', ancora: '4-anotacoes-das-aulas-e-inteligencia-artificial', revisar: true },
    { cat: 'dados', q: 'Quem mais recebe os meus dados?', curta: 'Serviços que ajudam a manter o site no ar: banco de dados e login (Supabase), envio de e-mails (Resend), voz dos cartões e login com Google (Google) e hospedagem (GitHub Pages). A voz dos cartões recebe só o texto do cartão.', artigo: 'politica', ancora: '5-quem-mais-ve-seus-dados', revisar: true },
    { cat: 'dados', q: 'Por quanto tempo o site guarda os meus dados?', curta: 'Enquanto a sua conta existir. Se você excluir a conta, o progresso, os cartões e o que a professora guardou sobre você são apagados. Os prazos para cada tipo de dado ainda estão sendo definidos.', artigo: 'politica', ancora: '7-por-quanto-tempo-guardamos', revisar: true },
    { cat: 'dados', q: 'Quais são os meus direitos sobre os meus dados?', curta: 'Você pode pedir para saber se o site guarda dados seus, ver esses dados, corrigir, apagar, receber uma cópia e saber com quem eles são compartilhados. Escreva para contato@profbrune.com.br.', artigo: 'politica', ancora: '8-seus-direitos' },
    { cat: 'dados', q: 'O site vende os meus dados?', curta: 'Não. Os dados não são vendidos nem usados para anúncios de outras empresas.', artigo: 'politica', ancora: '5-quem-mais-ve-seus-dados', revisar: true },
  ],
  // Textos completos. `simples` = "Em palavras simples" (resumo em linguagem comum, escrito por nós, mostrado ACIMA do texto do advogado).
  artigos: [
    { slug: 'termos', cat: 'dados', titulo: 'Termos e Condições', arquivo: 'textos/termos.html', estado: 'redacao',
      simples: ['As regras de uso do site: como a conta funciona, o que é grátis e o que é Premium, como cancelar, o que acontece com o que você cria e como a professora e o aluno se relacionam no site.', 'Este texto está sendo escrito com o advogado e ainda não vale.'],
      relacionados: ['politica'] },
    { slug: 'politica', cat: 'dados', titulo: 'Política de Privacidade', arquivo: 'textos/politica.html', estado: 'rascunho',
      simples: ['Quais dados o site guarda sobre você, para que servem, quem os vê e como apagar.', 'Se você tem uma professora no site, ela vê o seu progresso e as suas respostas aos cartões que ela preparou. Ela não vê a sua senha.', 'Você pode excluir a conta em Configurações e pedir os seus dados por e-mail.', 'Os trechos marcados com [CONFIRMAR] ainda estão sendo decididos com o advogado.'],
      relacionados: ['entrar-com-google', 'google-agenda', 'termos'] },
    { slug: 'entrar-com-google', cat: 'dados', titulo: 'Privacidade: Entrar com Google', arquivo: 'textos/entrar-com-google.html', estado: 'publicado', atualizado: '25 de outubro de 2026',
      simples: ['O botão "Entrar com Google" serve só para você entrar sem criar senha. O site recebe o seu nome, e-mail e foto, e mais nada.'],
      relacionados: ['politica', 'google-agenda'] },
    { slug: 'google-agenda', cat: 'dados', titulo: 'Privacidade: conexão com o Google Agenda', arquivo: 'textos/google-agenda.html', estado: 'publicado', atualizado: '25 de outubro de 2026',
      simples: ['Só professoras conectam. O site lê os eventos das agendas que ela escolher, só para registrar as aulas no dia e horário certos. Ele nunca escreve na agenda.'],
      relacionados: ['politica', 'entrar-com-google'] },
  ],
  // "Palavras difíceis": aparecem sublinhadas nos textos completos e listadas no fim do artigo. Definição em linguagem comum.
  glossario: [
    { termo: 'LGPD', def: 'A lei brasileira que protege os dados pessoais de todo mundo (Lei Geral de Proteção de Dados).' },
    { termo: 'titular', def: 'A pessoa a quem os dados pertencem. No site, é você.' },
    { termo: 'controlador', def: 'Quem decide para que e como os dados são usados.' },
    { termo: 'operador', def: 'Quem trata os dados seguindo as instruções do controlador.' },
    { termo: 'base legal', def: 'O motivo que a lei aceita para usar um dado, como a sua autorização ou um contrato.' },
    { termo: 'dado sensível', def: 'Dado mais delicado, como saúde, religião, política ou vida sexual.' },
    { termo: 'anonimização', def: 'Tirar de um dado tudo o que permite descobrir de quem ele é.' },
    { termo: 'portabilidade', def: 'Receber uma cópia dos seus dados para levar a outro serviço.' },
    { termo: 'criptografia', def: 'Embaralhar a informação para que só quem deve consiga ler.' },
    { termo: 'consentimento', def: 'A sua autorização clara para o uso de um dado.' },
    { termo: 'encarregado', def: 'A pessoa que responde por privacidade e conversa com você e com a autoridade de dados.' },
    { termo: 'ANPD', def: 'A autoridade do governo que fiscaliza o uso de dados pessoais.' },
    { termo: 'legítimo interesse', def: 'Um motivo que a lei aceita quando o uso do dado é razoável e não prejudica você.' },
  ],
};
if (typeof module !== 'undefined') module.exports = AJUDA;
