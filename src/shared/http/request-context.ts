import { AsyncLocalStorage } from 'node:async_hooks';

import type { UserRole } from '@prisma/client';

/**
 * Per-request facts that an audit row needs but a service should not have to
 * thread through its signature. The actor is filled in once the request has
 * been authenticated, so a denial recorded before that point simply has none.
 */
export type RequestContext = {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
  actor: { id: string; role: UserRole } | null;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function withRequestContext<T>(context: RequestContext, run: () => Promise<T>): Promise<T> {
  return storage.run(context, run);
}

export function currentRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function setContextActor(actor: { id: string; role: UserRole }): void {
  const context = storage.getStore();
  if (context) context.actor = actor;
}

export function requestContextFrom(request: Request, requestId: string): RequestContext {
  return {
    requestId,
    // Behind the compose/proxy setup the socket address is the proxy, so the
    // forwarded header is the only address worth recording.
    ip: firstForwardedFor(request.headers.get('x-forwarded-for')),
    userAgent: request.headers.get('user-agent')?.slice(0, 400) ?? null,
    actor: null,
  };
}

function firstForwardedFor(header: string | null): string | null {
  if (!header) return null;
  const first = header.split(',')[0]?.trim();
  return first ? first.slice(0, 64) : null;
}
