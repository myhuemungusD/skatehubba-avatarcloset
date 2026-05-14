'use client';

import { signOutAction } from '../app/auth/sign-out/actions';

export default function UserMenu() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="rounded border px-3 py-1 text-xs hover:bg-black hover:text-white"
      >
        Sign out
      </button>
    </form>
  );
}
