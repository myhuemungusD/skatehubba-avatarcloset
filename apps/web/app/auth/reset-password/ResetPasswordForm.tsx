'use client';

import { useActionState } from 'react';
import { resetPasswordAction, type ResetPasswordActionState } from './actions';

const initialState: ResetPasswordActionState = {};

export default function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<ResetPasswordActionState, FormData>(
    resetPasswordAction,
    initialState,
  );

  const fieldErrors = state.error?.fieldErrors ?? {};
  const formErrors = state.error?.formErrors ?? [];

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        New password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded border px-3 py-2"
        />
        {fieldErrors.password?.length ? (
          <span className="text-xs text-red-600">{fieldErrors.password[0]}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Confirm new password
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded border px-3 py-2"
        />
        {fieldErrors.confirmPassword?.length ? (
          <span className="text-xs text-red-600">{fieldErrors.confirmPassword[0]}</span>
        ) : null}
      </label>

      {formErrors.length ? (
        <ul className="text-xs text-red-600">
          {formErrors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {pending ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  );
}
