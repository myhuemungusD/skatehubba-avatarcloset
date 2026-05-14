import Link from 'next/link';
import { getCurrentUser } from '../lib/auth/server';
import UserMenu from './UserMenu';

export default async function Header() {
  const viewer = await getCurrentUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Link href="/" className="font-bold">
          SkateHubba
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {viewer ? (
            <>
              <Link href="/closet/me" className="underline-offset-2 hover:underline">
                @{viewer.profile?.username ?? 'closet'}
              </Link>
              <UserMenu />
            </>
          ) : (
            <>
              <Link href="/auth/sign-in" className="hover:underline">
                Sign in
              </Link>
              <Link href="/auth/sign-up" className="rounded bg-black px-3 py-1 text-white">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
