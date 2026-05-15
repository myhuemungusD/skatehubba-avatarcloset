import Link from 'next/link';

export default function ForgotPasswordSentPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-bold">Check your email</h1>
      <p className="text-sm opacity-80">
        If an account exists for that address, we just sent a password-reset link. Click it and
        you&apos;ll land on a page to set a new password.
      </p>
      <p className="text-sm opacity-70">The link expires in an hour. You can request another.</p>
      <p className="text-sm">
        Back to{' '}
        <Link href="/auth/sign-in" className="underline">
          sign in
        </Link>
        .
      </p>
    </main>
  );
}
