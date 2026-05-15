'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { cooldownStatus, getCurrentUser } from '../../lib/auth/server';
import { changeUsernameInput } from '../../lib/auth/schemas';

export interface ChangeUsernameActionState {
  error?: {
    formErrors: string[];
    fieldErrors: Record<string, string[]>;
  };
}

const TAKEN_MESSAGE = 'That username is taken.';

function formatNextEligible(d: Date): string {
  // Stable, locale-independent rendering for server-rendered error chips.
  // Matches what the UI shows when the form is in the locked state.
  return d.toISOString().slice(0, 10);
}

export async function changeUsernameAction(
  _prevState: ChangeUsernameActionState,
  formData: FormData,
): Promise<ChangeUsernameActionState> {
  // Normalize BEFORE validation so "FooBar" lowercases to "foobar" and
  // passes the lowercase-only regex. The DB column is citext + lowercase
  // CHECK; the three layers agree.
  const rawUsername = String(formData.get('username') ?? '').toLowerCase();
  const parsed = changeUsernameInput.safeParse({ username: rawUsername });
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      error: {
        formErrors: flat.formErrors,
        fieldErrors: flat.fieldErrors as Record<string, string[]>,
      },
    };
  }

  const viewer = await getCurrentUser();
  if (!viewer) redirect('/auth/sign-in');

  const supabase = await createSupabaseServerClient();
  const { data: me, error: meError } = await supabase
    .from('users')
    .select('id, username, username_changed_at')
    .eq('id', viewer.authUser.id)
    .maybeSingle();

  if (meError || !me) {
    return {
      error: { formErrors: ['Could not load your profile. Try again.'], fieldErrors: {} },
    };
  }

  // Server-authoritative cooldown re-check — UI state is advisory.
  const cooldown = cooldownStatus(me.username_changed_at);
  if (cooldown.locked && cooldown.nextEligibleAt) {
    return {
      error: {
        formErrors: [
          `You can change your username again on ${formatNextEligible(cooldown.nextEligibleAt)}.`,
        ],
        fieldErrors: {},
      },
    };
  }

  const newUsername = parsed.data.username;

  if (me.username === newUsername) {
    return {
      error: {
        formErrors: ['That is already your username.'],
        fieldErrors: {},
      },
    };
  }

  // Pre-flight collision: citext + casefold-aware UNIQUE means an exact
  // match here is the same case-insensitive match the DB UNIQUE would
  // raise. The DB safety net below catches the race.
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', newUsername)
    .maybeSingle();

  if (existing && existing.id !== me.id) {
    return {
      error: { formErrors: [TAKEN_MESSAGE], fieldErrors: { username: [TAKEN_MESSAGE] } },
    };
  }

  // Atomic rename: username + cooldown stamp in a single UPDATE. RLS
  // `users_self_update` allows column-level updates on the row where
  // auth.uid() = id, which is this row.
  const { error: updateError } = await supabase
    .from('users')
    .update({ username: newUsername, username_changed_at: new Date().toISOString() })
    .eq('id', me.id);

  if (updateError) {
    // 23505 = unique_violation. Maps to the same friendly "taken" error
    // as the pre-flight check, so a race between two users picking the
    // same handle gets the same UX as the slow case.
    if (updateError.code === '23505') {
      return {
        error: { formErrors: [TAKEN_MESSAGE], fieldErrors: { username: [TAKEN_MESSAGE] } },
      };
    }
    return {
      error: { formErrors: [updateError.message], fieldErrors: {} },
    };
  }

  redirect('/account');
}
