// Sign-in redirect allowlist + resolver. Kept OUT of `actions.ts` because
// `'use server'` requires every module export to be an async function;
// non-function exports (the Set + the sync resolver) crash `next build`
// with "Server Actions must be async functions." Same shape, same values,
// just a separate module.

export const SIGN_IN_NEXT_ALLOWLIST: ReadonlySet<string> = new Set(['/closet/me', '/account']);

export function resolveSignInNext(next: string | undefined | null): string {
  if (typeof next === 'string' && SIGN_IN_NEXT_ALLOWLIST.has(next)) return next;
  return '/closet/me';
}
