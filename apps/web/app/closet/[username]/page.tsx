import { notFound } from 'next/navigation';
import ClosetCanvasLoader from '../../../components/ClosetCanvasLoader';
import { getCurrentUser } from '../../../lib/auth/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

interface ClosetPageProps {
  params: Promise<{ username: string }>;
}

interface DisplayedItemRow {
  item_template_id: string;
  item_edition_id: string | null;
  serial_number: number | null;
}

export const dynamic = 'force-dynamic';

export default async function ClosetPage({ params }: ClosetPageProps) {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();

  // users.username is citext (see 0005_constraint_hardening.sql), so this
  // lookup is case-insensitive at the DB layer regardless of the URL casing.
  const { data: profile } = await supabase
    .from('users')
    .select('id, username, display_name')
    .eq('username', username)
    .maybeSingle();

  if (!profile) notFound();

  const viewer = await getCurrentUser();
  const isOwner = viewer?.authUser.id === profile.id;

  let items: DisplayedItemRow[] = [];

  if (isOwner) {
    const { data } = await supabase
      .from('inventory')
      .select('item_template_id, item_edition_id, serial_number')
      .eq('owner_id', profile.id);
    items = data ?? [];
  } else {
    const { data: closet } = await supabase
      .from('closets')
      .select('is_public')
      .eq('user_id', profile.id)
      .maybeSingle();
    if (!closet?.is_public) {
      return (
        <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-6 py-8">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">@{profile.username}</h1>
            <p className="text-sm opacity-70">This closet is private.</p>
          </header>
        </main>
      );
    }
    const { data } = await supabase
      .from('public_closet_inventory')
      .select('item_template_id, item_edition_id, serial_number')
      .eq('owner_id', profile.id);
    items = data ?? [];
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">@{profile.username}</h1>
        <p className="text-sm opacity-70">{isOwner ? 'Your closet.' : 'Visiting closet.'}</p>
      </header>
      <section className="aspect-video w-full overflow-hidden rounded border">
        <ClosetCanvasLoader />
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{isOwner ? 'Inventory' : 'On display'}</h2>
        {items.length === 0 ? (
          <p className="text-sm opacity-70">
            {isOwner ? 'Nothing here yet. Open a box once Phase 2 ships.' : 'No items on display.'}
          </p>
        ) : (
          <ul className="text-sm">
            {items.map((it, idx) => (
              <li key={`${it.item_edition_id ?? 'unlimited'}-${it.serial_number ?? idx}`}>
                {it.item_template_id}
                {it.serial_number ? ` #${it.serial_number}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
