import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../../lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function ClosetMePage() {
  const viewer = await getCurrentUser();
  if (!viewer) redirect('/auth/sign-in?next=/closet/me');

  const handle = viewer.profile?.username;
  if (!handle) {
    // handle_new_user always provisions a row; if it's missing the safest
    // fallback is to bounce home rather than render a broken closet.
    redirect('/');
  }

  redirect(`/closet/${handle}`);
}
