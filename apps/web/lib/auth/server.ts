import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '../supabase/server';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
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
    .select('id, username, display_name')
    .eq('id', user.id)
    .maybeSingle();

  return { authUser: user, profile: profile ?? null };
}
