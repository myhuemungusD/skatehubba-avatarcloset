import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '../../../lib/auth/server';
import SignUpForm from './SignUpForm';

export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  const viewer = await getCurrentUser();
  if (viewer) redirect('/closet/me');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="text-sm opacity-70">
        Pick a handle, lock in a password, confirm your email. You start with a Hubba Coin signup
        bonus.
      </p>
      <SignUpForm />
      <p className="text-sm">
        Already on the list?{' '}
        <Link href="/auth/sign-in" className="underline">
          Sign in
        </Link>
        .
      </p>
    </main>
  );
}
