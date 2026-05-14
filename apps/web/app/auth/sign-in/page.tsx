import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '../../../lib/auth/server';
import SignInForm from './SignInForm';

export const dynamic = 'force-dynamic';

interface SignInPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const viewer = await getCurrentUser();
  if (viewer) redirect('/closet/me');

  const params = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <SignInForm initialError={params.error} />
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
