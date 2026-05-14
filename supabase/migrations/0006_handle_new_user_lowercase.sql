-- =====================================================================
-- SkateHubba: Avatar Closet — handle_new_user defense-in-depth
-- Migration: 0006_handle_new_user_lowercase.sql
--
-- Reviewer B on Workstream C surfaced this: handle_new_user reads
-- raw_user_meta_data->>'username' verbatim. Every CURRENT in-tree path
-- (SignUpForm.toLowerCase() + Zod regex + HTML5 pattern attribute)
-- normalizes to lowercase before the metadata is set, so the trigger
-- always sees lowercase today. But 0005 added users_username_is_lowercase
-- CHECK constraint — if any future programmatic signup path bypassed
-- the form and passed mixed-case in metadata, the trigger would attempt
-- INSERT and fail the CHECK, leaving the user in a partially-provisioned
-- state (auth.users row exists but no users/wallets/closets row).
--
-- Per CLAUDE.md quality rule #2 (defense-in-depth welcome on load-
-- bearing surface), normalize inside the trigger so it cannot fail on
-- shape even if a caller forgets. The trigger is the sole writer to
-- users/wallets/coin_ledger/closets on signup — making it robust to
-- caller misbehavior is exactly the kind of belt-and-suspenders the
-- charter calls for.
-- =====================================================================

create or replace function handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta_username text;
  meta_display  text;
  fallback      text := 'skater_' || substring(new.id::text, 1, 8);
  final_user    text;
  final_display text;
begin
  -- Lowercase the username metadata defensively. The 0005 lowercase
  -- CHECK constraint would otherwise reject the INSERT if any future
  -- caller passed mixed case.
  meta_username := nullif(lower(new.raw_user_meta_data->>'username'), '');
  meta_display  := nullif(new.raw_user_meta_data->>'display_name', '');

  final_user    := coalesce(meta_username, fallback);
  final_display := coalesce(meta_display, meta_username, fallback);

  begin
    insert into users (id, username, display_name)
    values (new.id, final_user, final_display);
  exception when unique_violation then
    final_user := final_user || '_' || floor(random() * 1000)::int::text;
    insert into users (id, username, display_name)
    values (new.id, final_user, final_display);
  end;

  insert into wallets (user_id, balance) values (new.id, 500);
  insert into coin_ledger (user_id, amount, kind)
    values (new.id, 500, 'signup_bonus');
  insert into closets (user_id) values (new.id);

  return new;
end;
$$;

-- Trigger binding is unchanged; CREATE OR REPLACE FUNCTION updates in
-- place and the existing on_auth_user_created trigger from 0002 keeps
-- firing.
