# Laboratório de áudio do português: passo a passo

Para você OUVIR (1) as regras novas de leitura do português e (2) várias vozes do Google lendo as mesmas frases.
Nada é salvo no site: o laboratório só gera uma página com players, que você baixa e abre no computador.

## O que existe

| Modo | Para quê | Tamanho |
|---|---|---|
| `laboratorio-pt-regras` | Ouvir como a voz atual (`pt-BR-Chirp3-HD-Achernar`) lê hora, moeda, abreviações, "Bem-vindo(a)", "bonito / bonita", "3º andar", "Dra. Ângela". Cada caso tem a versão como o aluno vê, propostas de leitura e a leitura que a regra atual produz. | 10 casos, 40 áudios, cerca de 1.100 caracteres |
| `laboratorio-pt-vozes` | Ouvir 8 frases de referência (nasais, "r", "l" final, "d/t" antes de "i", "lh/nh", diálogos) em 15 vozes pt-BR: 9 Chirp3-HD (5 femininas, 4 masculinas), 3 Neural2 e 3 Wavenet. | 120 áudios, cerca de 6.600 caracteres |

Importante: hora, moeda e abreviações (`p.ex.`, `etc.`, `obs.`) AINDA NÃO têm regra no site. Nesses casos a linha
"regra atual" não aparece, porque o texto sai igual; as outras linhas são propostas para você escolher.
Gênero entre parênteses, barra, ordinais e títulos já têm regra (a linha com a seta "regra atual").

## Passo a passo no GitHub

1. Abra o repositório no GitHub e clique na aba **Actions**.
2. Na lista à esquerda, clique em **Áudio TTS**.
3. Clique no botão **Run workflow** (à direita, acima da lista de execuções).
4. Em **Use workflow from**, escolha a **branch** que a Claude indicou na mensagem (não deixe `main` se ela disse outra).
5. Em **modo**, escolha `laboratorio-pt-regras` ou `laboratorio-pt-vozes`. Faça um de cada vez.
6. Clique no botão verde **Run workflow**. A execução aparece na lista em alguns segundos (atualize a página se não aparecer).
7. Espere a bolinha ficar com o visto verde (regras: 1 a 2 minutos; vozes: 4 a 8 minutos).
8. Clique na execução e role até o fim da página, na parte **Artifacts**.
9. Baixe **laboratorio-audio-pt** (vem um arquivo .zip). Descompacte.
10. Dentro da pasta, dê dois cliques em **index.html**. Abre no navegador, com um player por áudio.
11. Ouça com fone de ouvido e anote no quadro abaixo.

O artefato fica disponível por alguns dias e depois some sozinho. Se der vermelho, mande o print da tela para a Claude.
Esses modos NUNCA salvam mp3 no repositório e não publicam o site.

## O que anotar

- **Regras:** para cada caso, qual linha soa mais natural (a 1ª, a 2ª...) e se a "regra atual" já está boa.
  Principalmente: hora ("14 horas e 30 minutos" ou "duas e meia"), moeda, abreviações, "Bem-vindo, bem-vinda" ou só "Bem-vindo".
- **Vozes:** nota de 1 a 5 em naturalidade; se as nasais (pão, mãe) e o "r" soam brasileiros; o "l" final de "Brasil"
  (se soa "u", como no Brasil todo, ou "l" de estrangeiro); "dia, tia" (se soa "djia, tchia", como em boa parte do país, ou "di, ti");
  e qual sotaque você percebe (carioca, paulista, neutro de telejornal, de outro estado, estrangeiro).
- Se alguma voz aparecer como "indisponível nesta conta", é normal: a lista de vozes muda e nem todas valem para todas as contas.

## Sotaque regional: o que o Google oferece

O Google só tem o idioma **pt-BR** (português do Brasil), sem escolha de carioca, paulistano etc. Cada voz tem um sotaque
próprio, geralmente um brasileiro "neutro". Não dá para pedir "voz carioca": só dá para ouvir as vozes e ver qual combina.
(Esta conclusão vem do que o projeto já registra e do conhecimento geral sobre a API; o ambiente em que isto foi feito não
tinha acesso à internet para reconferir a página oficial. Vale uma olhada em
<https://cloud.google.com/text-to-speech/docs/list-voices-and-types> antes de decidir algo grande.)

Opções a estudar, só se nenhuma voz do Google agradar (nada disso está implementado):
- outros serviços de voz com vozes brasileiras (por exemplo ElevenLabs, Microsoft Azure com vozes pt-BR de nomes diversos,
  Amazon Polly com Camila, Vitória e Thiago): conferir se há marcação de região e custo;
- gravação humana (voz de pessoas de cada região), inclusive de alunos ou colegas, para os áudios mais importantes;
- misturar: voz sintética para o volume e voz humana para diálogos de destaque.

## Custo e cota

- O Google dá uma cota grátis por mês de texto sintetizado (a anotação do projeto é 1 milhão de caracteres para Chirp 3 HD;
  o site usa cerca de 1,3%). Confira os valores atuais na página de preços do Google Cloud Text-to-Speech.
- `laboratorio-pt-regras`: cerca de 1.100 caracteres (0,1% de 1 milhão).
- `laboratorio-pt-vozes`: cerca de 6.600 caracteres (0,7%). Se passar da cota grátis, vozes Wavenet/Neural2 e Chirp
  têm preço por milhão de caracteres, e essa execução custaria centavos.
- Rodar de novo gasta de novo. Rodar a lista das 30 vozes (opção avançada `--vozes-todas`, só pelo terminal)
  são cerca de 15.900 caracteres.

## Quadro em branco

### Regras (modo `laboratorio-pt-regras`)

| Caso | Linha escolhida (1ª, 2ª...) | A regra atual está boa? | Observação |
|---|---|---|---|
| Hora 24h (14h30) | | | |
| Hora 24h (8h, 21h15) | | | |
| Moeda (R$ 5,50) | | | |
| Moeda (R$ 1.250,00 e R$ 1,00) | | | |
| p.ex., etc., obs. | | | |
| Bem-vindo(a) | | | |
| obrigado(a) | | | |
| bonito / bonita | | | |
| 3º andar, 1ª vez | | | |
| Dra. Ângela, Sr. e Sra. Silva | | | |

### Vozes (modo `laboratorio-pt-vozes`)

| Voz | Naturalidade (1 a 5) | Sotaque que percebo | Nasais / r / l final / d-t ok? | Observação |
|---|---|---|---|---|
| Achernar (atual) | | | | |
| Aoede | | | | |
| Kore | | | | |
| Leda | | | | |
| Zephyr | | | | |
| Puck | | | | |
| Charon | | | | |
| Fenrir | | | | |
| Orus | | | | |
| Neural2 A | | | | |
| Neural2 B | | | | |
| Neural2 C | | | | |
| Wavenet A | | | | |
| Wavenet B | | | | |
| Wavenet C | | | | |

### Decisão

| Pergunta | Resposta |
|---|---|
| Voz escolhida para o português | |
| Mais de uma voz (feminina e masculina) para diálogos? | |
| Variedade de sotaque que queremos (carioca, paulista, neutro) | |
| Vale estudar outro serviço ou gravação humana? | |
| Regras de hora, moeda e abreviações: quais virar regra | |

## Para quem mexe no código

- Script: `fr/scripts/audio_lab.py --lang pt --modo regras|vozes [--dry-run] [--vozes-todas]`.
- A lista de vozes é o dicionário `VOZES_PT` no começo do arquivo (uma linha por voz); as frases são `FRASES_PT_VOZES`
  e os casos de regras são `CASES_PT_REGRAS`.
- `_synthesize_raw` (`fr/scripts/challenges_pipeline/tts.py`) aceita `voice=` e `language_code=` opcionais;
  teste: `python3 fr/scripts/test_tts_voice_params.py`.
- Contexto das regras: `docs/pt-tts-revisao.md` (seção 4).
