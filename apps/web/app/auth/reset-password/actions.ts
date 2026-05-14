'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { getCurrentUser } from '../../../lib/auth/server';
import { resetPasswordInput } from '../../../lib/auth/schemas';

export interface ResetPasswordActionState {
  error?: {
    formErrors: string[];
    fieldErrors: Record<string, string[]>;
  };
}

export async function resetPasswordAction(
  _prevState: ResetPasswordActionState,
  formData: FormData,
): Promise<ResetPasswordActionState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = resetPasswordInput.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      error: {
        formErrors: flat.formErrors,
        fieldErrors: flat.fieldErrors as Record<string, string[]>,
      },
    };
  }

  // Re-verify the session at action time. The page already gates on this,
  // but the action is a separate request — it MUST also confirm a real
  // session before invoking updateUser. A null viewer here means the link
  // was used elsewhere or the session expired between page-load and submit.
  const viewer = await getCurrentUser();
  if (!viewer) {
    return {
      error: {
        formErrors: ['Your reset session has expired. Request a new link.'],
        fieldErrors: {},
      },
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error: { formErrors: [error.message], fieldErrors: {} },
    };
  }

  redirect('/closet/me');
}
