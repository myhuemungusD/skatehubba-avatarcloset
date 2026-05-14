'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { signUpInput } from '../../../lib/auth/schemas';

export interface SignUpActionState {
  error?: {
    formErrors: string[];
    fieldErrors: Record<string, string[]>;
  };
}

export async function signUpAction(
  _prevState: SignUpActionState,
  formData: FormData,
): Promise<SignUpActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = signUpInput.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      error: {
        formErrors: flat.formErrors,
        fieldErrors: flat.fieldErrors as Record<string, string[]>,
      },
    };
  }

  const { email, password, username } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const requestHeaders = await headers();
  const origin =
    requestHeaders.get('origin') ??
    (requestHeaders.get('host')
      ? `https://${requestHeaders.get('host')}`
      : 'http://localhost:3000');

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: username },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return {
      error: { formErrors: [error.message], fieldErrors: {} },
    };
  }

  redirect('/auth/check-email');
}
