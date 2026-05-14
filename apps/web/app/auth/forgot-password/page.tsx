import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../../lib/auth/server';
import ForgotPasswordForm from './ForgotPasswordForm';

export const dynamic = 'force-dynamic';

interface ForgotPasswordPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const viewer = await getCurrentUser();
  if (viewer) redirect('/account');

  const params = await searchParams;
  const initialError =
    params.error === 'link_expired'
      ? 'That reset link is no longer valid. Request a new one below.'
      : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-bold">Forgot password</h1>
      <p className="text-sm opacity-80">
        Enter your email and we&apos;ll send you a link to set a new password.
      </p>
      {initialError ? (
        <p className="text-xs text-red-600" role="alert">
          {initialError}
        </p>
      ) : null}
      <ForgotPasswordForm />
      <p className="text-sm">
        Remembered it?{' '}
        <Link href="/auth/sign-in" className="underline">
          Sign in
        </Link>
        .
      </p>
    </main>
  );
}
