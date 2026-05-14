'use client';

import Link from 'next/link';
import { signOutAction } from '../app/auth/sign-out/actions';

export default function UserMenu() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/account"
        className="rounded border px-3 py-1 text-xs hover:bg-black hover:text-white"
      >
        Account
      </Link>
      <form action={signOutAction}>
        <button
          type="submit"
          className="rounded border px-3 py-1 text-xs hover:bg-black hover:text-white"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
