# ADR-004: Authentication Strategy

## Status

Accepted

## Context

The application has three roles (New Recruit, Manager, Admin) and needs authenticated, role-based access to REST API endpoints. The solution should be stateless, SPA-friendly, and avoid heavy Identity UI scaffolding.

## Decision

Use **JWT-based authentication** with the token transported in an **HttpOnly, Secure (in production), SameSite=Lax cookie**.

- The backend issues a JWT at login and stores it in the cookie `access_token`.
- The JWT includes claims for user ID, email and role.
- The `JwtBearer` middleware is configured to read the token from the cookie when the `Authorization` header is absent.
- Passwords are hashed using `PasswordHasher<User>` from the ASP.NET Core Identity shared framework (without using the full Identity UI).
- The initial admin account is seeded from environment variables at startup.

## Alternatives Considered

| Alternative | Why Not Chosen |
|-------------|----------------|
| Server-side sessions | Stateful; requires session storage and complicates scaling. |
| JWT in `localStorage` | Exposes tokens to XSS; less secure than an HttpOnly cookie. |
| ASP.NET Core Identity with UI | Adds many tables, pages and scaffolding not needed for the exercise. |
| API keys | Does not support role-based access or session expiry naturally. |

## Consequences

- Stateless authentication; no server-side session store required.
- Secure against XSS because the token is not accessible to JavaScript.
- CORS must allow credentials from the Vite dev server.
- Logout clears the cookie on the server; tokens remain valid until expiry but the client no longer sends them.
- No refresh-token flow in the MVP; cookie expiry is set to a reasonable duration (e.g., 24 hours).
