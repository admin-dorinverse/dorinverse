-- A link type of its own for Jesus and the twelve he named apostles (Luke 6:13), apart from teacher,
-- which stays for every other teacher and follower. Owner ruling, 2026-10-31. Judas Iscariot keeps
-- his enemies link (Luke 22:47–48), since two cards share one link.
alter table public.character_connection drop constraint character_connection_type_check;
alter table public.character_connection add constraint character_connection_type_check
  check (type in ('family','marriage','friends','teacher','apostle','leader','enemies','message','story','prophecy'));
