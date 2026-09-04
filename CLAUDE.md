# Diretrizes para trabalho neste repositório

## Coerência pedagógica entre funcionalidades

Antes de ativar, unir ou reaproveitar duas funcionalidades/dados (ex: usar a
nota gramatical de uma unidade como explicação de um exercício específico,
ou reaproveitar um componente de outro contexto), **verifique se existe uma
relação pedagógica real entre os dois**, não só uma relação estrutural de
código (mesma unidade, mesmo arquivo, mesmo tipo de dado).

Caso concreto que motivou esta regra: o painel "Por que errei?" do
Verdadeiro/Falso usava a nota gramatical genérica da unidade (primeiro item
de `usageNote`/`GRAMMAR_NOTES`) como explicação, só porque os dois viviam na
mesma unidade — mas em vários casos reais a nota falava de um assunto
totalmente diferente da afirmação testada (ex: claim sobre "谢谢/obrigado"
mostrando explicação sobre o verbo 是). Corrigido dando a cada item de
`trueFalseExercises` um `whyNote` autorado especificamente para aquela
afirmação (ver PRs #74/#75).

Ao revisar ou construir algo assim, pergunte: "essa explicação/conteúdo
reutilizado realmente responde à pergunta específica que o aluno está vendo
na tela, ou só está ali porque estava disponível/próximo no código?"

## Passos manuais (migrações Supabase etc.) sempre entregues junto

Sempre que um PR exigir uma ação manual da autora (rodar uma migration SQL no
Supabase, configurar algo no dashboard, etc.), o link/instrução correspondente
deve ser entregue **junto com o aviso de que o passo é necessário** — no mesmo
resumo de entrega do PR/feature — nunca só depois que ela perguntar por ele.

Regra motivadora, verbatim: "Lembre que se eu tiver que fazer alguma
alteração manual, não quero ter que pedir por algo que poderia ter sido
enviado anteriormente."

Na prática: ao terminar de mergear um PR que criou uma migration nova (ou
qualquer outro passo manual), o link direto do arquivo já deve estar na
mensagem final, não só a menção de que "uma migração é necessária". Se várias
migrações pendentes se acumularem (ainda não confirmadas como rodadas),
relistar todas com seus links a cada entrega nova, não só a mais recente.
