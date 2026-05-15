import { describe, expect, it } from 'vitest';

import { forgotPasswordInput, resetPasswordInput } from '../lib/auth/schemas';

describe('forgotPasswordInput', () => {
  it('accepts a valid email', () => {
    expect(forgotPasswordInput.safeParse({ email: 'rider@example.com' }).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(forgotPasswordInput.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects a missing email', () => {
    expect(forgotPasswordInput.safeParse({}).success).toBe(false);
  });
});

describe('resetPasswordInput', () => {
  const valid = { password: 'kickflip8', confirmPassword: 'kickflip8' };

  it('accepts a matching pair at the minimum length', () => {
    expect(resetPasswordInput.safeParse(valid).success).toBe(true);
  });

  it('rejects a password shorter than 8 chars', () => {
    const result = resetPasswordInput.safeParse({
      password: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched password + confirm with error on confirmPassword', () => {
    const result = resetPasswordInput.safeParse({
      password: 'kickflip8',
      confirmPassword: 'kickflip9',
    });
    expect(result.success).toBe(false);
    const issues = result.success ? [] : result.error.issues;
    const onConfirm = issues.some((i) => i.path.includes('confirmPassword'));
    expect(onConfirm).toBe(true);
  });

  it('rejects missing fields', () => {
    expect(resetPasswordInput.safeParse({ password: 'kickflip8' }).success).toBe(false);
    expect(resetPasswordInput.safeParse({ confirmPassword: 'kickflip8' }).success).toBe(false);
  });
});
