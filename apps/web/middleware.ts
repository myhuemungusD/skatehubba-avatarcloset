import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { publicEnv } from './lib/env';
import { resolveSignInNext } from './app/auth/sign-in/next';

interface CookieSetEntry {
  name: string;
  value: string;
  options?: CookieOptions;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieSetEntry[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname === '/closet/me' && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/sign-in';
    url.searchParams.set('next', '/closet/me');
    return NextResponse.redirect(url);
  }

  if (pathname === '/account' && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/sign-in';
    url.searchParams.set('next', '/account');
    return NextResponse.redirect(url);
  }

  // /auth/reset-password is intentionally exempt from the "authed → bounce"
  // logic below: the reset flow lands here WITH a fresh session (callback
  // exchanged the code) and the page itself requires that session to render
  // the password form. Bouncing the user away here breaks the reset flow.

  // /auth/sign-in honors `?next=<path>` on the authed bounce so a user who
  // started at /account, got redirected to sign-in, opened a new tab, signed
  // in there, and came back continues to /account instead of /closet/me.
  // The allowlist is the same as the action's — hard-coded set, no regex.
  if (user && pathname === '/auth/sign-in') {
    const target = resolveSignInNext(request.nextUrl.searchParams.get('next'));
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = '';
    return NextResponse.redirect(url);
  }

  // /auth/sign-up does not honor next — there is no flow that lands a
  // signed-in user on the sign-up page with a meaningful return target.
  if (user && pathname === '/auth/sign-up') {
    const url = request.nextUrl.clone();
    url.pathname = '/closet/me';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/health).*)'],
};
