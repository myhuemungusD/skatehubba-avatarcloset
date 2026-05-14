import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-bold">SkateHubba: Avatar Closet</h1>
      <p className="text-base">
        Phase 1 scaffold. The closet is the feed. Drop rates are public. Trading is
        peer-to-peer, item-for-item.
      </p>
      <nav className="flex flex-col gap-2 text-base underline">
        <Link href="/closet/example">Visit an example closet</Link>
        <Link href="/auth/sign-in">Sign in</Link>
      </nav>
    </main>
  );
}
