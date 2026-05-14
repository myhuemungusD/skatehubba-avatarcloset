import { describe, expect, it } from 'vitest';
import { resolveSignInNext, SIGN_IN_NEXT_ALLOWLIST } from '../app/auth/sign-in/next';

describe('resolveSignInNext (open-redirect guard)', () => {
  it('accepts every path in the allowlist verbatim', () => {
    for (const path of SIGN_IN_NEXT_ALLOWLIST) {
      expect(resolveSignInNext(path)).toBe(path);
    }
  });

  it('falls back to /closet/me on undefined / null / empty', () => {
    expect(resolveSignInNext(undefined)).toBe('/closet/me');
    expect(resolveSignInNext(null)).toBe('/closet/me');
    expect(resolveSignInNext('')).toBe('/closet/me');
  });

  it('rejects external-URL injection attempts', () => {
    expect(resolveSignInNext('//evil.com')).toBe('/closet/me');
    expect(resolveSignInNext('http://evil.com')).toBe('/closet/me');
    expect(resolveSignInNext('https://evil.com')).toBe('/closet/me');
    expect(resolveSignInNext('javascript:alert(1)')).toBe('/closet/me');
  });

  it('rejects unknown internal paths (allowlist, not heuristic)', () => {
    expect(resolveSignInNext('/closet/someone-else')).toBe('/closet/me');
    expect(resolveSignInNext('/auth/sign-up')).toBe('/closet/me');
    expect(resolveSignInNext('/admin')).toBe('/closet/me');
  });

  it('rejects path-traversal-shaped values', () => {
    expect(resolveSignInNext('/account/../admin')).toBe('/closet/me');
    expect(resolveSignInNext('/account?evil=1')).toBe('/closet/me');
    expect(resolveSignInNext('/account#hash')).toBe('/closet/me');
  });

  it('is case-sensitive on allowlist match', () => {
    expect(resolveSignInNext('/ACCOUNT')).toBe('/closet/me');
    expect(resolveSignInNext('/Closet/Me')).toBe('/closet/me');
  });
});
