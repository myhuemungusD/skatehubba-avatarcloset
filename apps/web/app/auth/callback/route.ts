import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

// `next` is a strict allowlist, not a regex. Open-redirect prevention: any
// value outside this set falls back to /closet/me. Reset-password flow
// relies on /auth/reset-password being in the list.
const NEXT_ALLOWLIST = new Set<string>(['/closet/me', '/auth/reset-password']);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next');
  const next = nextParam && NEXT_ALLOWLIST.has(nextParam) ? nextParam : '/closet/me';

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/sign-in?error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
