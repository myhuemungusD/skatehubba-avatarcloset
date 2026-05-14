'use client';

import { useActionState } from 'react';
import { changeUsernameAction, type ChangeUsernameActionState } from './actions';

interface UsernameFormProps {
  currentUsername: string;
  locked: boolean;
  nextEligibleAt: string | null;
}

const initialState: ChangeUsernameActionState = {};

function formatDate(iso: string): string {
  // Same locale-independent ISO date the server formats with, so the
  // advisory UI matches the server's error chip on a race.
  return iso.slice(0, 10);
}

export default function UsernameForm({
  currentUsername,
  locked,
  nextEligibleAt,
}: UsernameFormProps) {
  const [state, formAction, pending] = useActionState<ChangeUsernameActionState, FormData>(
    async (prev, formData) => {
      const username = String(formData.get('username') ?? '').toLowerCase();
      formData.set('username', username);
      return changeUsernameAction(prev, formData);
    },
    initialState,
  );

  const fieldErrors = state.error?.fieldErrors ?? {};
  const formErrors = state.error?.formErrors ?? [];

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Username
        <input
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={24}
          pattern="[a-z0-9_]{3,24}"
          autoComplete="username"
          defaultValue={currentUsername}
          disabled={locked}
          className="rounded border px-3 py-2 disabled:bg-neutral-100 disabled:text-neutral-500"
        />
        {locked && nextEligibleAt ? (
          <span className="text-xs opacity-70">
            You can change your username again on {formatDate(nextEligibleAt)}.
          </span>
        ) : (
          <span className="text-xs opacity-70">
            3–24 chars: letters, numbers, underscore. Stored lowercase. Your old @handle becomes
            free for anyone to claim.
          </span>
        )}
        {fieldErrors.username?.length ? (
          <span className="text-xs text-red-600">{fieldErrors.username[0]}</span>
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
        disabled={pending || locked}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Change username'}
      </button>
    </form>
  );
}
