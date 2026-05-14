import { describe, expect, it } from 'vitest';
import { createApp } from '../index.js';
import { healthResponse } from '@skatehubba/schema';

// Minimal in-process express invocation. We don't open a real port — we
// invoke the route handler via a stubbed req/res to keep the test hermetic.
describe('GET /health', () => {
  it('returns a zod-valid health envelope', async () => {
    const app = createApp();
    const layer = app._router.stack.find(
      (l: { route?: { path?: string } }) => l.route?.path === '/health',
    );
    expect(layer).toBeTruthy();

    const handler = layer.route.stack[0].handle;
    let captured: unknown;
    const req = {} as unknown as Parameters<typeof handler>[0];
    const res = {
      json: (body: unknown) => {
        captured = body;
      },
    } as unknown as Parameters<typeof handler>[1];

    await handler(req, res, () => undefined);
    const parsed = healthResponse.parse(captured);
    expect(parsed.ok).toBe(true);
    expect(parsed.service).toBe('realtime');
    expect(parsed.version).toBe('0.1.0');
  });
});
