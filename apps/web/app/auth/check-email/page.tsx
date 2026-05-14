import Link from 'next/link';

export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-bold">Check your email</h1>
      <p className="text-sm opacity-80">
        We sent a confirmation link. Click it and you&apos;ll land in your closet.
      </p>
      <p className="text-sm">
        Wrong address?{' '}
        <Link href="/auth/sign-up" className="underline">
          Sign up again
        </Link>
        .
      </p>
    </main>
  );
}
