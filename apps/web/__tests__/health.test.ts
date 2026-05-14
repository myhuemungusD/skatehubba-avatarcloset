import { describe, expect, it } from 'vitest';

import { GET } from '../app/api/health/route';
import { healthResponse } from '@skatehubba/schema';

describe('GET /api/health', () => {
  it('returns a zod-valid health envelope', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown;
    const parsed = healthResponse.parse(body);
    expect(parsed.ok).toBe(true);
    expect(parsed.service).toBe('web');
    expect(parsed.version).toBe('0.1.0');
  });
});
