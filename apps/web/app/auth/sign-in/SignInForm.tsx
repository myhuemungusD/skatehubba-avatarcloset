'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { signInAction, type SignInActionState } from './actions';

interface SignInFormProps {
  initialError?: string;
}

export default function SignInForm({ initialError }: SignInFormProps) {
  const initialState: SignInActionState = initialError
    ? { error: { formErrors: [initialError], fieldErrors: {} } }
    : {};
  const [state, formAction, pending] = useActionState<SignInActionState, FormData>(
    signInAction,
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
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded border px-3 py-2"
        />
        {fieldErrors.password?.length ? (
          <span className="text-xs text-red-600">{fieldErrors.password[0]}</span>
        ) : null}
        <Link
          href="/auth/forgot-password"
          className="self-start text-xs underline underline-offset-2 opacity-80 hover:opacity-100"
        >
          Forgot password?
        </Link>
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
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
