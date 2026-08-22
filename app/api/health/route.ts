import { NextResponse } from 'next/server';

import { databaseIsUp } from '@/src/modules/health/service';

export const dynamic = 'force-dynamic';

type HealthBody = {
  status: 'ok' | 'degraded';
  database: 'up' | 'down';
  timestamp: string;
};

/**
 * Liveness + readiness probe. Deliberately unauthenticated and deliberately
 * silent about *why* the database is down: the failure reason goes to the
 * server log, never to the client (S14).
 */
export async function GET(): Promise<NextResponse<HealthBody>> {
  const database: HealthBody['database'] = (await databaseIsUp()) ? 'up' : 'down';

  const body: HealthBody = {
    status: database === 'up' ? 'ok' : 'degraded',
    database,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: database === 'up' ? 200 : 503 });
}
