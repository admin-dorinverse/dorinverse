-- Recipes are no longer grouped onto shelves (owner ruling, 2026-11-01). No recipe rows exist yet.
alter table public.recipe drop column shelf;
