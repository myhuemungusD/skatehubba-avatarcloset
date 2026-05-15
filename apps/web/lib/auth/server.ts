import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../supabase/server';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  // NULL on signup; set the first time the user changes their handle. The
  // 30-day cooldown in /account is enforced by cooldownStatus() below and
  // re-enforced server-side by changeUsernameAction. UI state is advisory.
  username_changed_at: string | null;
}

export interface CurrentUser {
  authUser: User;
  profile: UserProfile | null;
}

// Single source of truth for "who is the viewer". Always uses getUser() so the
// session is verified against auth.users — never trusts the unverified cookie
// payload returned by getSession().
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('id, username, display_name, username_changed_at')
    .eq('id', user.id)
    .maybeSingle();

  return { authUser: user, profile: profile ?? null };
}

// Username-change cooldown: 30 days from the last rename. NULL
// `username_changed_at` (fresh signups) means no prior change, change is
// allowed now. This is a pure helper — the server action re-runs it
// against the freshly-read row, the UI uses it for advisory disable state.
export const USERNAME_CHANGE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export interface CooldownStatus {
  locked: boolean;
  nextEligibleAt: Date | null;
}

export function cooldownStatus(
  usernameChangedAt: string | null,
  now: Date = new Date(),
): CooldownStatus {
  if (!usernameChangedAt) return { locked: false, nextEligibleAt: null };
  const changedAt = new Date(usernameChangedAt);
  if (Number.isNaN(changedAt.getTime())) return { locked: false, nextEligibleAt: null };
  const eligible = new Date(changedAt.getTime() + USERNAME_CHANGE_COOLDOWN_MS);
  if (eligible.getTime() <= now.getTime()) {
    return { locked: false, nextEligibleAt: null };
  }
  return { locked: true, nextEligibleAt: eligible };
}
