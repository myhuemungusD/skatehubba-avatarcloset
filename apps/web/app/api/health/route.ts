import { NextResponse } from 'next/server';
import { healthResponse } from '@skatehubba/schema';

export const dynamic = 'force-static';

export async function GET() {
  const body = healthResponse.parse({ ok: true, service: 'web', version: '0.1.0' });
  return NextResponse.json(body);
}
