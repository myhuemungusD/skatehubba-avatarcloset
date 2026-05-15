'use client';

import { useActionState } from 'react';
import { forgotPasswordAction, type ForgotPasswordActionState } from './actions';

const initialState: ForgotPasswordActionState = {};

export default function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ForgotPasswordActionState, FormData>(
    forgotPasswordAction,
    initialState,
  );

  const fieldErrors = state.error?.fieldErrors ?? {};
  const formErrors = state.error?.formErrors ?? [];

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded border px-3 py-2"
        />
        {fieldErrors.email?.length ? (
          <span className="text-xs text-red-600">{fieldErrors.email[0]}</span>
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
        {pending ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  );
}
