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
- **Consentimento, modo básico**: o código do Google só é baixado depois do "Aceitar". Sem aceite, nada vai para o Google
  (nem os "sinais sem cookie" do modo avançado). "Aceitar" e "Recusar" com o mesmo destaque, escolha guardada e link
  "Preferências de cookies" no rodapé.
- **Política**: opção B. Uma "Política de cookies" curta e separada, em pt-BR e en, publicada junto com o GA4. A mesma
  seção entra no rascunho da política geral (aba Privacidade do Admin e `ajuda/textos/politica.html`), que segue só em
  pt-BR até o advogado fechar; quando fechar, as duas se juntam.
- **Sem dados pessoais no Google**: nada de nome, e-mail ou id. Limpar o endereço antes de enviar (`?convite=`,
  `#access_token=`, `#error=` e outros parâmetros que não sejam UTM). Não medir o Painel de Admin nem a atividade da dona.
  Nas páginas abertas ela não está logada: prever um "Não contar este aparelho".
- **Links `?origem=` dos testes**: continuam como estão (a planilha do Apps Script depende deles). A moldura repassa todos
  os parâmetros, então os `utm_` também chegam à planilha. Pendência futura: migrar os `?origem=` para UTM.

## Ponto em aberto

- **Idade mínima**: a dona não tem alunos menores nas aulas, mas o cadastro do site não pergunta a idade, e nem os Termos
  nem a política em rascunho falam de idade mínima. Levar ao advogado (LGPD, art. 14) antes de publicar a política de cookies.

## Andamento

- 2026-11-14: decisão registrada. Fase 0 (levantamento) ainda não começou. Plano completo das fases: prompt da dona
  (Fases 0 a 5, aprovação "Fase N aprovada" entre elas; nada vai para a `main` sem aprovação).
