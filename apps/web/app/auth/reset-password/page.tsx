import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../../lib/auth/server';
import ResetPasswordForm from './ResetPasswordForm';

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage() {
  // The reset flow lands here AFTER /auth/callback exchanged the link code
  // for a real session. No session here = the link was bad, expired, or
  // already used. Bounce back to /auth/forgot-password with an error chip.
  const viewer = await getCurrentUser();
  if (!viewer) redirect('/auth/forgot-password?error=link_expired');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-bold">Set a new password</h1>
      <p className="text-sm opacity-80">
        Pick a password at least 8 characters. You&apos;ll stay signed in after.
      </p>
      <ResetPasswordForm />
    </main>
  );
}
