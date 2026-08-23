import { NextResponse, type NextRequest } from 'next/server';

import { readSession, SESSION_COOKIE } from '@/src/modules/auth/session';

const PUBLIC_ROUTES = ['/login', '/signup'];

/**
 * A cheap gate, not the authorization boundary: it only verifies the cookie's
 * signature so unauthenticated visitors get a redirect instead of a flash of an
 * empty page. Every route and API handler still resolves the actor from the
 * database and authorizes independently (S3).
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!session && !isPublicRoute) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/signup',
    '/dashboard/:path*',
    '/tasks/:path*',
    '/issues/:path*',
    '/feedback/:path*',
    '/notes/:path*',
    '/team/:path*',
    '/reports/:path*',
    '/profile/:path*',
    '/change-password',
    '/admin/:path*',
  ],
};
