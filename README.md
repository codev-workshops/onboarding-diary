# Onboarding Diary

A web application for new recruits to document their onboarding journey. Built with .NET 10 Web API + Next.js.

## Architecture

```
backend/
  OnboardingDiary.Api          - ASP.NET Core Web API, controllers, auth pipeline
  OnboardingDiary.Application  - DTOs, interfaces, validators (persistence-ignorant)
  OnboardingDiary.Domain       - Entities, enums, constants
  OnboardingDiary.Infrastructure - EF Core, auth service implementations
  OnboardingDiary.Tests        - Unit + integration tests

frontend/                     - Next.js 16 (App Router)
```

## Configuration

### JWT (`Jwt` section in appsettings)

| Key                | Default | Description                                         |
|--------------------|---------|-----------------------------------------------------|
| `Issuer`           | `OnboardingDiary` | JWT issuer claim                        |
| `Audience`         | `OnboardingDiary` | JWT audience claim                      |
| `SigningKey`       | *(dev only key)* | HS256 signing key (>= 32 bytes). **In production, load from a secret store or environment variable -- never commit.** |
| `AccessTokenMinutes` | `15`  | Access token lifetime                               |
| `RefreshTokenDays` | `7`    | Refresh token lifetime                              |

### Security / Lockout (`Security` section)

| Key                | Default | Description                                       |
|--------------------|---------|---------------------------------------------------|
| `MaxFailedAttempts`| `5`     | Failed login attempts before lockout              |
| `LockoutMinutes`   | `15`    | Lockout duration in minutes                       |

### Database

Connection string in `ConnectionStrings:DefaultConnection`. A default admin user is seeded in Development (`Seed:AdminEmail` / `Seed:AdminPassword`).

### Migration

Phase 2 adds `FailedLoginAttempts` and `LockoutEnd` to `User`, plus a `PasswordResetTokens` table. Generate the migration:

```bash
cd backend
dotnet ef migrations add AddAuthLockoutAndResetTokens \
  --project OnboardingDiary.Infrastructure \
  --startup-project OnboardingDiary.Api
```

Migrations are auto-applied at startup in Development via `DbSeeder`.

## Auth Endpoints (`/api/auth/`)

| Method | Path              | Auth     | Description                                     |
|--------|-------------------|----------|-------------------------------------------------|
| POST   | `/register`       | Anonymous| Create user (defaults to Recruit role) -> 201   |
| POST   | `/login`          | Anonymous| Returns access + refresh tokens -> 200          |
| POST   | `/logout`         | Anonymous| Revokes refresh token -> 204                    |
| POST   | `/refresh`        | Anonymous| Rotates tokens -> 200                           |
| POST   | `/forgot-password`| Anonymous| Sends reset token (24h) via email -> 200        |
| POST   | `/reset-password` | Anonymous| Resets password, revokes all refresh tokens -> 200 |
| GET    | `/ping`           | Bearer   | Returns current user id/role (smoke-test) -> 200|

### Swagger

Run the backend and visit `/swagger`. Use the Authorize button (lock icon) to paste a JWT access token from the `/login` response.

### Account Lockout

After 5 consecutive failed login attempts (configurable), the account is locked for 15 minutes. A successful login resets the counter.

### Email

`IEmailSender` is implemented by `LoggingEmailSender` which logs emails to the console. Replace with a real SMTP sender for production.

## Running

### Backend

```bash
cd backend/OnboardingDiary.Api
dotnet run
# Swagger at https://localhost:7030/swagger
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

Set `NEXT_PUBLIC_API_BASE_URL` to override the backend URL (defaults to `https://localhost:7030`).

### Tests

```bash
cd backend
dotnet test
```

## Frontend Auth

- **Token storage**: access token in memory, refresh token in localStorage (trade-off: simpler setup vs. XSS risk; httpOnly cookies recommended for production).
- **401 interceptor**: on 401, the API client automatically attempts one refresh; on failure, clears tokens and redirects to `/login`.
- **Protected routes**: wrap pages with `<ProtectedRoute>` to enforce authentication.
- **Pages**: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/dashboard` (placeholder).

## Authorization Policies

| Policy                | Requirement                                         |
|-----------------------|-----------------------------------------------------|
| `AdminOnly`           | Role = Admin                                        |
| `ManagerOrAdmin`      | Role = Manager or Admin                             |
| `AssignedRecruitOrSelf` | Caller is Admin, or owns the resource, or is a Manager assigned to the recruit |
