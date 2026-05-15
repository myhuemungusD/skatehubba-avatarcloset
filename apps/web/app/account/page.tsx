import { redirect } from 'next/navigation';
import { cooldownStatus, getCurrentUser } from '../../lib/auth/server';
import UsernameForm from './UsernameForm';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const viewer = await getCurrentUser();
  if (!viewer) redirect('/auth/sign-in?next=/account');

  // A signed-in user without a profile row is a data-shape bug (the
  // handle_new_user trigger should have created one). Bounce them to the
  // home page rather than render a broken form.
  if (!viewer.profile) redirect('/');

  const status = cooldownStatus(viewer.profile.username_changed_at);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-16">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="text-sm opacity-70">Settings that change how the world sees you.</p>
      </header>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Username</h2>
        <UsernameForm
          currentUsername={viewer.profile.username}
          locked={status.locked}
          nextEligibleAt={status.nextEligibleAt?.toISOString() ?? null}
        />
      </section>
    </main>
  );
}
