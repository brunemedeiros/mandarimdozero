# Lista de verificação da lição curta (verificação independente de cada unidade)

Decisão 374 (a dona, 2026-11-23): a verificação independente de cada unidade passa por esta lista inteira, item por item, antes da
publicação da maquete. O subagente recebe este arquivo e devolve os achados com o id da tela. O que dá para conferir por código já
está em `fr/scripts/curriculo_licao_curta.js` (`conferirTelas`); o resto é leitura humana.

## Notas e explicações
1. **Cada exemplo ilustra o que o título e o texto da nota ensinam.** Exemplo de outro verbo, de outra estrutura ou de outra regra
   é erro (ex.: *Ils sont de Paris* na nota "Avoir no plural"). Contraste só quando o texto anuncia o contraste e a dona pediu.
2. **Cada forma citada no texto da nota tem uma frase de exemplo** (ex.: a nota cita *vous êtes*: tem de haver frase com
   *vous êtes*). Nota de conjugação declara `formas`; o validador confere os itens 1 e 2 para elas.
3. Texto em tópicos, uma informação por tela, poucos exemplos (decisão 366); francês em `<strong>`, português em `<b>`.
4. Explicação de pronúncia certa e coerente com o que já foi ensinado (ex.: ligação antes de vogal, decisão 369).

## Exercícios
5. Um exercício depois de cada palavra, frase ou explicação nova (decisões 362 e 365).
6. O exercício cobra o que a tela anterior ensinou; uma só resposta certa defensável (ex.: "Monte a frase" com *tu* e *vous* nas peças diz o registro na tradução, decisão 377); distratores plausíveis e de fato errados.
7. A resposta certa muda de posição (decisão 368); "Complete" alterna grafia e outra palavra (decisão 342).
8. Nada que ainda não foi ensinado (palavra, forma, regra); frases neutras em gênero quando é o aluno que fala.
9. Painel diz o que a palavra ou forma é e por que a resposta está certa ou errada; nada de "tradução ao pé da letra" quando o
   português usa a mesma estrutura.
10. Frases sem repetir à toa entre exemplo e exercício (o exemplo não entrega a resposta do exercício seguinte).

## Voz e língua
11. Francês correto (gramática, acentos, elisão, espaço antes de ? ! : ;) e tradução natural.
12. Voz da professora: 1ª pessoa, "você", calorosa e curta; "em francês", nunca "usamos"; sem "pra", "--", travessão; nada de
    vivência inventada (`docs/voz-da-professora.md`).
