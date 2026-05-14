'use client';

import { useActionState } from 'react';
import { signUpAction, type SignUpActionState } from './actions';

const initialState: SignUpActionState = {};

export default function SignUpForm() {
  const [state, formAction, pending] = useActionState<SignUpActionState, FormData>(
    async (prev, formData) => {
      const username = String(formData.get('username') ?? '').toLowerCase();
      formData.set('username', username);
      return signUpAction(prev, formData);
    },
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

      <label className="flex flex-col gap-1 text-sm">
        Username
        <input
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={24}
          pattern="[A-Za-z0-9_]{3,24}"
          autoComplete="username"
          className="rounded border px-3 py-2"
        />
        <span className="text-xs opacity-70">
          3–24 chars: letters, numbers, underscore. Stored lowercase.
        </span>
        {fieldErrors.username?.length ? (
          <span className="text-xs text-red-600">{fieldErrors.username[0]}</span>
        ) : null}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Password
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
        Confirm password
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
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
