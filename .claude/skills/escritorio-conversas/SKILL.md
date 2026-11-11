---
name: escritorio-conversas
description: Atualizar o "Escritório das Conversas" (página em pixel art com as sessões do Claude Code da autora na nuvem, quem espera resposta, quem trabalha, quem terminou). Use quando a autora pedir "atualiza meu escritório", perguntar quais conversas esperam por ela, ou quiser evoluir o escritório para atualização automática (opção B).
---

# Escritório das Conversas

Página privada (Artifact) da autora: **https://claude.ai/artifact/5nieY37JZFRGJBC1kt8RBt**.
Criada em 2026-11-11 a pedido dela, na **opção A**: é uma foto, só muda quando ela pede. Toda conversa que
ela abre é uma sessão do Claude Code **na nuvem** (pelo app no Windows); ferramentas que só veem sessões locais,
como o Habblaud, não servem para o dia a dia dela (testado em 2026-11-11: funciona no Windows dela só com sessões
de terminal; ela gostou, mas preferiu continuar na nuvem).

## Atualizar (opção A)

1. `mcp__claude-code-remote__list_sessions` com `mine: true`, `limit: 40`. Ignorar `SESSION_STATUS_ARCHIVED`.
2. `Artifact` com `action: "read"` e o `url` acima. A resposta indica o arquivo salvo com a página inteira.
3. Trocar SÓ o bloco `<script type="application/json" id="dados">`: `foto` = hora de agora (UTC, ISO) e a lista
   `conversas`. O resto da página (desenho, salas, textos fixos) não muda numa atualização.
4. Publicar com `Artifact` (publish) passando `url` e o arquivo salvo como `file_path`. Sem `icon`.
5. Responder no chat com o link e a fila "Esperando você" em tabela curta (título + pergunta), mais antiga primeiro.

### Cada conversa no JSON

`{"id","titulo","sala","estado","texto","atualizado", "fixada"?, "naoLida"?, "nota"?}`

- `estado` (de `status_bucket`): BLOCKED → `esperando`; REVIEW_READY → `conferir`; WORKING → `trabalhando`;
  COMPLETED/FAILED/IDLE → `terminada`.
- `texto`: `post_turn_summary.needs_action` (esperando) ou `recent_action`/`task_summary`, **em português do
  Brasil** (traduzir o que vier em inglês; "Approve or deny AskUserQuestion" = "Tem uma pergunta com opções
  esperando a sua escolha."). Sem texto: frase curta do estado ("Tem trabalho pronto para você revisar.").
- `fixada`: tag `ui:pinned`. `naoLida`: `unread: true`. `nota`: aviso útil (título desatualizado, PR aberto não mesclado).
- `sala` (ids): `conteudo` (trilha, Desafios, Jogos, áudio, francês/mandarim), `professora` (Banco, alunos,
  aulas, Premium), `visual` (telas, design, ícones, navegação), `oficina` (testes, consertos, comparações
  técnicas), `rotinas` (tarefas agendadas, revisor, curiosidades). Na dúvida: `recepcao`. Manter a sala que a
  conversa já tinha na foto anterior; a autora pode pedir para mudar.

## Privacidade

Os dados (títulos e perguntas das conversas) ficam **só no Artifact**. Nunca gravar a página nem os dados no
repositório: a `main` é publicada no GitHub Pages.

## Opção B (automática) -- ainda NÃO ligada

A autora aceitou evoluir para a B no futuro. Quando ela pedir: tarefa agendada (`create_trigger`, sessão nova a
cada disparo) que roda os passos acima. Antes, avisar que cada atualização gasta do limite do plano mesmo sem
mudança, propor um horário espaçado (ex.: 3 vezes por dia, fora das 6h-9h do Pacífico) e pedir a aprovação dela.
Registrar o id da tarefa no `CLAUDE.md`, seção "Estado atual".
