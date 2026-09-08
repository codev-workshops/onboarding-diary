# ADR-006. JWT access-token-only authentication

- **Status**: Accepted
- **Date**: 2026-09-08
- **Deciders**: Project owner

## Context

The MVP needs email and password authentication with three roles. An earlier draft of the plan
proposed short-lived access tokens plus rotating refresh tokens with server-side storage and
reuse detection. The project owner ruled that out as excessive for this scope.

## Decision

Authenticate with a **JWT bearer access token only**. Login returns a token carrying subject,
email, role, and name claims, with a lifetime long enough (8 hours) that a working session does
not expire mid-use. The client attaches it as `Authorization: Bearer` and **logout simply clears
the client-side token**.

Explicitly out of scope: refresh tokens, refresh-token database storage, rotation, reuse
detection, and token-family revocation.

## Consequences

- The API is fully stateless with respect to sessions: no token table, no revocation list.
- A token cannot be revoked before it expires; deactivating a user takes effect only when their
  current token expires. Accepted for the MVP.
- A longer-lived token in the browser is a larger exposure window, mitigated by keeping the
  token in memory (with a `sessionStorage` fallback for reloads), carrying no sensitive claims,
  and rate-limiting login.
- Expiry handling is a plain 401 → redirect to login, preserving the attempted route.

## Alternatives considered

- **Access + rotating refresh tokens** — better revocation and a shorter exposure window, but it
  requires a token store, rotation and reuse-detection logic, and cookie/CORS handling; ruled out
  as out of scope.
- **Server-side sessions with a cookie** — trivially revocable, but reintroduces session state
  and complicates the SPA/API split.
