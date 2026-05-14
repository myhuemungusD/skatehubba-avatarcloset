import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'node:http';
import express, { type Request, type Response } from 'express';
import { healthResponse } from '@skatehubba/schema';

import { env } from './lib/env.js';
import { ClosetRoom } from './rooms/ClosetRoom.js';

export function createApp() {
  const app = express();
  app.get('/health', (_req: Request, res: Response) => {
    res.json(healthResponse.parse({ ok: true, service: 'realtime', version: '0.1.0' }));
  });
  return app;
}

export async function start(): Promise<Server> {
  const app = createApp();
  const httpServer = createServer(app);
  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
  });
  gameServer.define('closet', ClosetRoom);
  await gameServer.listen(env.REALTIME_PORT);
  console.log(`[realtime] listening on :${env.REALTIME_PORT}`);
  return gameServer;
}

const isEntrypoint = (() => {
  if (!process.argv[1]) return false;
  try {
    const entry = new URL(`file://${process.argv[1]}`).href;
    return import.meta.url === entry;
  } catch {
    return false;
  }
})();

if (isEntrypoint) {
  start().catch((err) => {
    console.error('[realtime] failed to start', err);
    process.exit(1);
  });
}
