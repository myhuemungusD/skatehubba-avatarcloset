import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '../../../lib/auth/server';
import SignInForm from './SignInForm';
import { resolveSignInNext } from './actions';

export const dynamic = 'force-dynamic';

interface SignInPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const next = resolveSignInNext(params.next);

  const viewer = await getCurrentUser();
  // Already signed in → bounce to the requested next (allowlist-validated)
  // so a signed-in user landing here via /account → /auth/sign-in?next=/account
  // continues to /account instead of being silently sent to /closet/me.
  if (viewer) redirect(next);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <SignInForm initialError={params.error} next={next} />
      <p className="text-sm">
        New here?{' '}
        <Link href="/auth/sign-up" className="underline">
          Create an account
        </Link>
        .
      </p>
    </main>
  );
}
