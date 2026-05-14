import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-bold">SkateHubba: Avatar Closet</h1>
      <p className="text-base">
        Phase 1 scaffold. The closet is the feed. Drop rates are public. Trading is peer-to-peer,
        item-for-item.
      </p>
      <nav className="flex flex-col gap-2 text-base">
        <Link href="/auth/sign-up" className="w-fit rounded bg-black px-4 py-2 text-white">
          Create your closet
        </Link>
        <Link href="/auth/sign-in" className="w-fit underline">
          Sign in
        </Link>
        <Link href="/closet/example" className="w-fit text-sm underline">
          Visit a closet (demo)
        </Link>
      </nav>
    </main>
  );
}
