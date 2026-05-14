'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { forgotPasswordInput } from '../../../lib/auth/schemas';

export interface ForgotPasswordActionState {
  error?: {
    formErrors: string[];
    fieldErrors: Record<string, string[]>;
  };
}

export async function forgotPasswordAction(
  _prevState: ForgotPasswordActionState,
  formData: FormData,
): Promise<ForgotPasswordActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = forgotPasswordInput.safeParse(raw);
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
  const requestHeaders = await headers();
  const origin =
    requestHeaders.get('origin') ??
    (requestHeaders.get('host')
      ? `https://${requestHeaders.get('host')}`
      : 'http://localhost:3000');

  // Silent on unknown emails: do not expose whether the address is registered.
  // We ignore the Supabase result and always redirect to the same "sent" page.
  // The 'next' query param is allowlisted in /auth/callback so the user lands
  // on /auth/reset-password after the magic link exchanges for a session.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
  });

  redirect('/auth/forgot-password/sent');
}
