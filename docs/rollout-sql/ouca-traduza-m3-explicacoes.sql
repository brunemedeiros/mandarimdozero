-- Ouça e traduza do Módulo 3 (A1-m3), opção A da dona (2026-11-10): os 10 desafios da produção ficam, nos mesmos códigos,
-- e ganham explicação (pt-BR; o inglês vem do overlay fr/challenges.en.js). Em "Tu veux du sucre ?" (lt-a1m3-008) sai a
-- tradução aceita de Portugal "Tu queres açúcar?" (regra da dona: forma de Portugal vale Quase) e entra "Você quer um pouco de açúcar?".
-- Só UPDATE de data->explanation e data->referenceTranslations; nada de progresso. Cada UPDATE confere a frase em francês e se a
-- explicação ainda está vazia (rodar duas vezes não muda nada). O Staging não tem estes desafios (0 linhas lá).
-- Antes de aplicar, guardar o retrato: docs/i18n/challenges-producao-a1m3-lt.json (2026-10-19, ainda igual à produção em 2026-11-10).
-- Desfazer: update public.challenges set data = data || jsonb_build_object('explanation', '') where id like 'lt-a1m3-%';
--   e, no 008: data || jsonb_build_object('referenceTranslations', jsonb_build_array('Você quer açúcar?','Tu queres açúcar?','Quer açúcar?')).

update public.challenges set data = data || jsonb_build_object('explanation', '"Loin de" = "longe de", e "d''ici" = de + ici ("daqui"). Para dizer onde um lugar fica, o francês usa "être": "est loin" = "fica longe".')
 where id = 'lt-a1m3-001' and data->>'sentenceFr' = 'Le musée est loin d''ici.' and coalesce(data->>'explanation', '') = '';
update public.challenges set data = data || jsonb_build_object('explanation', '"Tournez" é o imperativo de cortesia (vous); "tout droit" = "reto", "em frente".')
 where id = 'lt-a1m3-002' and data->>'sentenceFr' = 'Tournez à droite, puis tout droit.' and coalesce(data->>'explanation', '') = '';
update public.challenges set data = data || jsonb_build_object('explanation', '"Je viens de" indica origem: "du" = de + le (du Brésil); "et toi ?" devolve a pergunta.')
 where id = 'lt-a1m3-003' and data->>'sentenceFr' = 'Je viens du Brésil, et toi ?' and coalesce(data->>'explanation', '') = '';
update public.challenges set data = data || jsonb_build_object('explanation', 'A nacionalidade concorda com a pessoa: "américain" (ele), "américaine" (ela). No feminino, o "n" passa a ser pronunciado.')
 where id = 'lt-a1m3-004' and data->>'sentenceFr' = 'Elle est américaine.' and coalesce(data->>'explanation', '') = '';
update public.challenges set data = data || jsonb_build_object('explanation', '"Coûte" é a forma do verbo "coûter" (custar) para uma coisa só; "cinquante" = 50.')
 where id = 'lt-a1m3-005' and data->>'sentenceFr' = 'Le pantalon coûte cinquante euros.' and coalesce(data->>'explanation', '') = '';
update public.challenges set data = data || jsonb_build_object('explanation', '"Je cherche" já significa "estou procurando": o francês usa o presente para a ação em curso.')
 where id = 'lt-a1m3-006' and data->>'sentenceFr' = 'Je cherche une robe.' and coalesce(data->>'explanation', '') = '';
update public.challenges set data = data || jsonb_build_object('explanation', '"Des" é o plural indefinido ("legumes") e "du" é partitivo ("arroz", sem contar).')
 where id = 'lt-a1m3-007' and data->>'sentenceFr' = 'J''achète des légumes et du riz.' and coalesce(data->>'explanation', '') = '';
update public.challenges set data = data || jsonb_build_object('explanation', '"Du" é o partitivo: um pouco de algo que não se conta; em português fica sem artigo ("açúcar"). "Tu veux" é o "você quer" informal, e a pergunta vem só pela entonação.', 'referenceTranslations', jsonb_build_array('Você quer açúcar?', 'Quer açúcar?', 'Você quer um pouco de açúcar?'))
 where id = 'lt-a1m3-008' and data->>'sentenceFr' = 'Tu veux du sucre ?' and coalesce(data->>'explanation', '') = '';
update public.challenges set data = data || jsonb_build_object('explanation', 'Depois de quantidade, o francês usa "de": "un kilo de pommes", sem artigo.')
 where id = 'lt-a1m3-009' and data->>'sentenceFr' = 'Je prends un kilo de pommes.' and coalesce(data->>'explanation', '') = '';
update public.challenges set data = data || jsonb_build_object('explanation', 'Depois de um recipiente vem "de" sem artigo, e "de" vira "d''" antes de vogal: "une bouteille d''eau".')
 where id = 'lt-a1m3-010' and data->>'sentenceFr' = 'Une bouteille d''eau, s''il vous plaît.' and coalesce(data->>'explanation', '') = '';
