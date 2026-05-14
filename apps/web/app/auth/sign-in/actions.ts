'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { signInInput } from '../../../lib/auth/schemas';

// Routes a freshly-signed-in user is allowed to return to. Mirrors the
// middleware redirect target. Hard-coded set (no regex) — same shape as the
// /auth/callback NEXT_ALLOWLIST. Anything else falls back to /closet/me.
export const SIGN_IN_NEXT_ALLOWLIST: ReadonlySet<string> = new Set(['/closet/me', '/account']);

export function resolveSignInNext(next: string | undefined | null): string {
  if (typeof next === 'string' && SIGN_IN_NEXT_ALLOWLIST.has(next)) return next;
  return '/closet/me';
}

export interface SignInActionState {
  error?: {
    formErrors: string[];
    fieldErrors: Record<string, string[]>;
  };
}

export async function signInAction(
  _prevState: SignInActionState,
  formData: FormData,
): Promise<SignInActionState> {
  const raw = Object.fromEntries(formData.entries());
  const next = typeof raw.next === 'string' ? raw.next : undefined;
  const parsed = signInInput.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      error: {
        formErrors: flat.formErrors,
        fieldErrors: flat.fieldErrors as Record<string, string[]>,
      },
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error: { formErrors: [error.message], fieldErrors: {} },
    };
  }

  redirect(resolveSignInNext(next));
}
