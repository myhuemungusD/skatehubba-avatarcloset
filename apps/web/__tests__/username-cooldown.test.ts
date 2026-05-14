import { describe, expect, it } from 'vitest';

import { cooldownStatus, USERNAME_CHANGE_COOLDOWN_MS } from '../lib/auth/server';

describe('cooldownStatus', () => {
  const now = new Date('2026-05-14T12:00:00.000Z');

  it('returns unlocked when username_changed_at is null (fresh signup)', () => {
    const result = cooldownStatus(null, now);
    expect(result.locked).toBe(false);
    expect(result.nextEligibleAt).toBeNull();
  });

  it('returns locked when last change was 1 day ago', () => {
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const result = cooldownStatus(oneDayAgo, now);
    expect(result.locked).toBe(true);
    expect(result.nextEligibleAt).not.toBeNull();
  });

  it('returns locked when last change was 29 days ago', () => {
    const days29 = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString();
    const result = cooldownStatus(days29, now);
    expect(result.locked).toBe(true);
    expect(result.nextEligibleAt?.getTime()).toBe(
      new Date(days29).getTime() + USERNAME_CHANGE_COOLDOWN_MS,
    );
  });

  it('returns unlocked when last change was exactly 30 days ago', () => {
    const days30 = new Date(now.getTime() - USERNAME_CHANGE_COOLDOWN_MS).toISOString();
    const result = cooldownStatus(days30, now);
    expect(result.locked).toBe(false);
    expect(result.nextEligibleAt).toBeNull();
  });

  it('returns unlocked when last change was 31 days ago', () => {
    const days31 = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const result = cooldownStatus(days31, now);
    expect(result.locked).toBe(false);
    expect(result.nextEligibleAt).toBeNull();
  });

  it('treats unparseable timestamps as no prior change (defensive)', () => {
    const result = cooldownStatus('not-a-date', now);
    expect(result.locked).toBe(false);
    expect(result.nextEligibleAt).toBeNull();
  });

  it('returns the correct next-eligible date 30 days after the last change', () => {
    const changedAt = '2026-05-01T00:00:00.000Z';
    const result = cooldownStatus(changedAt, new Date('2026-05-02T00:00:00.000Z'));
    expect(result.locked).toBe(true);
    expect(result.nextEligibleAt?.toISOString()).toBe('2026-05-31T00:00:00.000Z');
  });
});
