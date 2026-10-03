-- contas LEGADAS (antes da 060): usernames escolhidos, inclusive com '.'
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-0000000000a1','ana.silva@example.com'),
 ('00000000-0000-0000-0000-0000000000a2','bruno@example.com'),
 ('00000000-0000-0000-0000-0000000000a3','carla@example.com');
insert into public.profiles(user_id, username, display_name, bio) values
 ('00000000-0000-0000-0000-0000000000a1','ana.silva','Ana Silva','bio a'),
 ('00000000-0000-0000-0000-0000000000a2','bruno22','Bruno',null),
 ('00000000-0000-0000-0000-0000000000a3','carla.m','Carla M','bio c');
