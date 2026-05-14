-- =====================================================================
-- SkateHubba: Avatar Closet — search_path hardening
-- Migration: 0004_searchpath_hardening.sql
--
-- The two trigger functions defined in 0001_init.sql predated the
-- CVE-2018-1058 hardening posture this project adopted from 0002 onward.
-- Every trigger function added in 0002 and 0003 pins `search_path = public`;
-- the originals from 0001 never got the fix. Pinning them now closes the
-- inconsistency. ALTER FUNCTION ... SET is used so we don't have to
-- recreate the functions and re-bind their triggers.
-- =====================================================================

alter function set_updated_at()        set search_path = public;
alter function prevent_retire_unset()  set search_path = public;
