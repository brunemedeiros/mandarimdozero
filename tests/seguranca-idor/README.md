# Teste IDOR (aluno A x aluno B)

IDOR = uma conta troca o id na requisição e mexe nos dados de outra. Criado na auditoria de 2026-11-25
(`docs/historico/36-auditoria-seguranca-2026-11.md`).

## Como rodar

Só no **Staging** (`ilfjzizjfcmhibkhwber`), colando `idor_staging.sql` no SQL Editor ou pelo MCP `execute_sql`.
O Staging tem as mesmas regras (RLS) da produção: conferir antes com
`select md5(string_agg(tablename||policyname||cmd||roles::text||coalesce(qual,'')||coalesce(with_check,''),'|' order by tablename,policyname)), count(*) from pg_policies where schemaname='public';`
nos dois projetos (devem dar o mesmo hash).

O script cria 3 contas fictícias (`zz-idor-a|b|t@example.invalid`), dá dados ao B e age logado como A, como visitante e
como a professora do B. Termina com `RAISE EXCEPTION`, então **nada fica gravado**. A "mensagem de erro" é o resultado:

- `IDOR_OK passou=N` → tudo certo.
- `IDOR_FALHOU passou=N falhou=M {...}` → a lista diz o que abriu.

O MCP pode pedir confirmação para rodar (o script tem `delete`, que é a tentativa de apagar do aluno A, desfeita no fim).

## O que confere

| Grupo | Esperado |
|---|---|
| Controle: B enxerga cada um dos seus dados (15 tabelas); a professora do B recebe o resumo dele | vê (senão o teste não prova nada) |
| A lê / edita / apaga dados do B: progress, own_flashcards, decks, notifications, push_subscriptions, profile_private, profiles, notification_preferences, friend_settings, tts_generation_log, course_restart_backups, reports, teacher_flashcards, teacher_students, account_roles | 0 linhas ou recusado |
| A edita / apaga weekly_xp e earned_badges do B (a leitura é pública de propósito: Ranking) | 0 linhas |
| A cria linha em nome do B (cartão, progresso, aviso, XP, conquista, vínculo com professora, report), A vira admin, report com status/nota/resposta, report com e-mail de outra pessoa | recusado |
| Funções com id do B: resumo, métricas, decks, recomeços do aluno, `ensure_user_decks`, `ensure_teacher_decks`, `admin_get_account_roles` | `not_authorized` |
| Visitante lê cartões, progresso, cartões da professora e reports do B | 0 linhas |
| Visitante cria report em nome do B ou com status | recusado |
| Report legítimo, igual ao do site (logado e visitante com e-mail) | aceito |

Fora deste teste (não verificado aqui): as Edge Functions (`push-send`, `delete-my-account`, `tts-generate` etc.) e o
dado que a própria conta grava sobre si (XP e conquistas: a conta ainda consegue se dar XP; decisão pendente da autora).
