-- ===========================================================================
-- One friend code per person, for good (owner, 2026-11-22). Making a new code is taken out of the app, and the
-- server function that did it is removed, so nobody can call it directly to churn out codes. A person's code is
-- still made the first time they need it, by friend_code_mine().
-- ===========================================================================

drop function if exists public.friend_code_renew();
