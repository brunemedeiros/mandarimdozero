---
name: registrar-entrega
description: Registrar o resultado de uma entrega/fase (decisões, arquivos, testes, pendências, passos manuais) no lugar certo sem inchar o CLAUDE.md. Use ao terminar qualquer tarefa que mereça registro, ou quando a autora pedir para "anotar", "registrar" ou "documentar" algo.
---

# Registrar entrega

O `CLAUDE.md` raiz é carregado em toda sessão: só regras curtas e o "Estado atual". Fluxo:

1. **Relatório da entrega** (o que foi feito, decisões, testes com números, achados): acrescentar ao arquivo do
   tema em `docs/historico/` (ou criar `docs/historico/NN-tema.md` com cabeçalho `# Histórico: <tema>`).
2. **Regra nova que vale para uma área**: atualizar `.claude/rules/<tema>.md` (1 a 3 linhas). Para o projeto inteiro:
   seção "Regras do projeto inteiro" do `CLAUDE.md`. Procurar duplicata antes; atualizar em vez de repetir.
3. **Procedimento repetível**: virar/atualizar uma skill em `.claude/skills/`.
4. **Estado vivo** (migration aplicada, pendência aberta): 1 linha em "Estado atual" do `CLAUDE.md`; remover a
   linha quando fechar (o detalhe fica no histórico).
5. **Na resposta à autora**: resumo curto + passos manuais com link + pendências (não colar o relatório inteiro).

Nunca colar no `CLAUDE.md`: logs de teste, listas de verificação, relatórios por fase, texto de commit.
