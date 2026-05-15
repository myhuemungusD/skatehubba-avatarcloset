// Callback redirect allowlist + resolver. Kept in a sibling module so unit
// tests can import the resolver directly without exercising the route
// handler's Supabase code-exchange flow. Mirrors apps/web/app/auth/sign-in/next.ts
// — same shape, different valid targets.
//
// /closet/me is the default landing after email confirm or any auth event.
// /auth/reset-password is the destination after the password-reset email
// link's PKCE code is exchanged. Any value outside this set falls back to
// /closet/me — no regex, no protocol-relative slip, fail-closed.

export const CALLBACK_NEXT_ALLOWLIST: ReadonlySet<string> = new Set([
  '/closet/me',
  '/auth/reset-password',
]);

export function resolveCallbackNext(next: string | undefined | null): string {
  if (typeof next === 'string' && CALLBACK_NEXT_ALLOWLIST.has(next)) return next;
  return '/closet/me';
}
