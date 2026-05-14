'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { signInInput } from '../../../lib/auth/schemas';

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

  redirect('/closet/me');
}
