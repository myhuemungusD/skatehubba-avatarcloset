import { describe, expect, it } from 'vitest';
import { resolveCallbackNext, CALLBACK_NEXT_ALLOWLIST } from '../app/auth/callback/next';

describe('resolveCallbackNext (open-redirect guard on auth code-exchange)', () => {
  it('accepts every path in the allowlist verbatim', () => {
    for (const path of CALLBACK_NEXT_ALLOWLIST) {
      expect(resolveCallbackNext(path)).toBe(path);
    }
  });

  it('falls back to /closet/me on undefined / null / empty', () => {
    expect(resolveCallbackNext(undefined)).toBe('/closet/me');
    expect(resolveCallbackNext(null)).toBe('/closet/me');
    expect(resolveCallbackNext('')).toBe('/closet/me');
  });

  it('rejects external-URL injection attempts', () => {
    expect(resolveCallbackNext('//evil.com')).toBe('/closet/me');
    expect(resolveCallbackNext('http://evil.com')).toBe('/closet/me');
    expect(resolveCallbackNext('https://evil.com')).toBe('/closet/me');
    expect(resolveCallbackNext('javascript:alert(1)')).toBe('/closet/me');
  });

  it('rejects unknown internal paths (allowlist, not heuristic)', () => {
    expect(resolveCallbackNext('/account')).toBe('/closet/me');
    expect(resolveCallbackNext('/closet/someone-else')).toBe('/closet/me');
    expect(resolveCallbackNext('/auth/sign-in')).toBe('/closet/me');
    expect(resolveCallbackNext('/admin')).toBe('/closet/me');
  });

  it('rejects path-traversal-shaped values', () => {
    expect(resolveCallbackNext('/auth/reset-password/../admin')).toBe('/closet/me');
    expect(resolveCallbackNext('/auth/reset-password?evil=1')).toBe('/closet/me');
    expect(resolveCallbackNext('/auth/reset-password#hash')).toBe('/closet/me');
  });

  it('is case-sensitive on allowlist match', () => {
    expect(resolveCallbackNext('/AUTH/reset-password')).toBe('/closet/me');
    expect(resolveCallbackNext('/Closet/Me')).toBe('/closet/me');
  });

  it('exposes the same allowlist contents that the route handler uses', () => {
    expect(CALLBACK_NEXT_ALLOWLIST.has('/closet/me')).toBe(true);
    expect(CALLBACK_NEXT_ALLOWLIST.has('/auth/reset-password')).toBe(true);
    expect(CALLBACK_NEXT_ALLOWLIST.size).toBe(2);
  });
});
