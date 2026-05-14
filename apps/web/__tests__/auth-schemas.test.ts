import { describe, expect, it } from 'vitest';

import { signInInput, signUpInput, usernameRegex } from '../lib/auth/schemas';

describe('signUpInput', () => {
  const valid = {
    email: 'rider@example.com',
    password: 'kickflip8',
    confirmPassword: 'kickflip8',
    username: 'kf_rider_8',
  };

  it('accepts a valid payload', () => {
    expect(signUpInput.parse(valid)).toMatchObject(valid);
  });

  it('rejects an invalid email', () => {
    const result = signUpInput.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects passwords shorter than 8 chars', () => {
    const result = signUpInput.safeParse({
      ...valid,
      password: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched password + confirm', () => {
    const result = signUpInput.safeParse({
      ...valid,
      confirmPassword: 'kickflip9',
    });
    expect(result.success).toBe(false);
    const issues = result.success ? [] : result.error.issues;
    const onConfirm = issues.some((i) => i.path.includes('confirmPassword'));
    expect(onConfirm).toBe(true);
  });

  it('rejects usernames shorter than 3 chars', () => {
    const result = signUpInput.safeParse({ ...valid, username: 'ab' });
    expect(result.success).toBe(false);
  });

  it('rejects usernames longer than 24 chars', () => {
    const result = signUpInput.safeParse({
      ...valid,
      username: 'a'.repeat(25),
    });
    expect(result.success).toBe(false);
  });

  it('rejects uppercase characters (form normalizes before submit)', () => {
    const result = signUpInput.safeParse({ ...valid, username: 'KF_Rider' });
    expect(result.success).toBe(false);
  });

  it('rejects disallowed punctuation', () => {
    const result = signUpInput.safeParse({ ...valid, username: 'kf-rider' });
    expect(result.success).toBe(false);
  });

  it('accepts boundary lengths 3 and 24', () => {
    expect(signUpInput.safeParse({ ...valid, username: 'abc' }).success).toBe(true);
    expect(signUpInput.safeParse({ ...valid, username: 'a'.repeat(24) }).success).toBe(true);
  });
});

describe('usernameRegex', () => {
  it('matches lowercase alphanumerics and underscores within bounds', () => {
    expect(usernameRegex.test('hubba_kid')).toBe(true);
    expect(usernameRegex.test('hubba_kid_42')).toBe(true);
  });

  it('rejects empty, too-short, or uppercase input', () => {
    expect(usernameRegex.test('')).toBe(false);
    expect(usernameRegex.test('ab')).toBe(false);
    expect(usernameRegex.test('Hubba')).toBe(false);
  });
});

describe('signInInput', () => {
  it('accepts a minimal payload', () => {
    const result = signInInput.safeParse({
      email: 'rider@example.com',
      password: 'anything-nonempty',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a bad email', () => {
    const result = signInInput.safeParse({
      email: 'nope',
      password: 'anything-nonempty',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty password', () => {
    const result = signInInput.safeParse({
      email: 'rider@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});
