# ADR-006: Bearer Token Transport

## Status

Accepted — supersedes [ADR-004](ADR-004-authentication-strategy.md).

## Context

ADR-004 chose JWT authentication with the access token carried in an HttpOnly `access_token`
cookie. Cookie transport pulls in consequences the MVP does not want: credentialed CORS, a
same-origin (or proxied) SPA, cookie option matrices per environment, CSRF reasoning, and a
server-side logout endpoint whose only job is to expire the cookie.

The approved MVP is a stateless API consumed by a separate SPA, with no refresh tokens and no
other cookie-dependent feature, so nothing else justifies that cost.

## Decision

The access JWT travels in the **`Authorization: Bearer <token>` request header**.

- `POST /api/v1/auth/login` returns the access token in the **response body**.
- The SPA attaches `Authorization: Bearer <token>` to API requests.
- **No authentication cookies**, and therefore no CORS `AllowCredentials` and no CSRF middleware.
  CORS still restricts requests to the explicit Vite origin.
- The `fetch` wrapper does **not** set `credentials: 'include'`.
- Protected endpoints use ASP.NET Core JWT Bearer authentication (`AddJwtBearer`); claims remain
  user id, email and role. Passwords still use `PasswordHasher<User>`, as in ADR-004.
- **Logout is client-side**: the SPA discards the token. There is no server-side revocation.
- **Token lifetime is 60 minutes.** An expired token yields `401` and the user signs in again.
- The SPA keeps the token in **auth state (memory)**; where surviving a page refresh matters it
  is mirrored into `sessionStorage`, never `localStorage`.

## Alternatives Considered

| Alternative | Why Not Chosen |
|-------------|----------------|
| Keep ADR-004's HttpOnly cookie | Forces credentialed CORS, a same-origin/proxied SPA, per-environment cookie options and CSRF handling for an MVP that has no other cookie need. |
| Refresh tokens with a cookie-held refresh credential | Explicitly out of scope: no rotation, reuse detection or token-family revocation in the MVP. |
| `localStorage` for the token | Survives tab close and browser restart, widening the XSS blast radius for no requirement. |
| Server-side session store | Stateful; the reason ADR-004 rejected it still holds. |

## Consequences

- A token in JavaScript-reachable storage is readable by any successful XSS, which the cookie
  model prevented. Mitigations: 60-minute expiry, `sessionStorage` (cleared with the tab) rather
  than `localStorage`, React's default JSX escaping, and no `dangerouslySetInnerHTML`.
- The SPA and API no longer need a shared origin; the Vite `/api` proxy stays a convenience, not
  a requirement.
- Logout cannot revoke anything — a leaked token stays valid until it expires. Accepted for the
  exercise; a deny-list or short-lived tokens with refresh would be the exit path.
- Every authenticated request depends on the wrapper attaching the header, so the wrapper's
  unit tests must cover both the attach and 401 paths.
- ADR-002's "cookie handling between Vite dev server and ASP.NET Core" consequence no longer
  applies.
