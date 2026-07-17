# Tech Stack

The MANDATE delegates the stack to the candidate ("tech stack is candidate's
choice"). The product owner confirmed the high-level direction: a **React**
frontend talking to a **REST** backend. This document records the concrete
selections. See [`ASSUMPTIONS.md`](./ASSUMPTIONS.md) §3 for the decision context.

## Architecture

- **Client:** React single-page application (SPA).
- **Server:** Stateless **REST** API.
- **Auth:** JWT bearer tokens (see `ASSUMPTIONS.md` §1).

## Frontend

| Concern          | Choice                     | Notes                                            |
| ---------------- | -------------------------- | ------------------------------------------------ |
| Language         | TypeScript                 | Type safety across the app.                       |
| Framework        | React                      | Confirmed by product owner.                       |
| Build / dev      | Vite                       | Fast dev server and build tooling.                |
| Routing          | React Router               | Client-side routing.                              |
| Server state     | TanStack Query             | Data fetching, caching, invalidation.             |
| Forms            | React Hook Form            | Form state and validation wiring.                 |
| Styling          | Tailwind CSS               | Utility-first, responsive layout.                 |
| Onboarding UI    | React Joyride              | Tooltips / coach marks / welcome mats (see below).|

## Backend

| Concern          | Choice                     | Notes                                            |
| ---------------- | -------------------------- | ------------------------------------------------ |
| Language         | TypeScript (Node.js)       | Shared language with the frontend.                |
| Framework        | Express                    | Minimal, well-understood REST framework.          |
| ORM              | Prisma                     | Single ORM targeting both SQLite and PostgreSQL.  |
| Validation       | Zod                        | Request/DTO validation.                           |
| Auth tokens      | jsonwebtoken               | JWT issue/verify.                                 |
| Password hashing | bcrypt                     | Adaptive hashing behind `PasswordPolicy`.         |

## Database

- **First boot / zero-config:** **SQLite** via Prisma — supports the first-boot
  behavior in `ASSUMPTIONS.md` §2 (works immediately, no external service).
- **Production:** **PostgreSQL** via Prisma — once an Admin configures it, data is
  migrated/populated and the onboarding enablers are disabled.
- Using Prisma for both keeps a single schema/migration path and makes switching
  engines a configuration change rather than a rewrite.

## Reports

| Format | Library        | Notes                                  |
| ------ | -------------- | -------------------------------------- |
| PDF    | PDFKit         | Server-side PDF generation.            |
| CSV    | csv-stringify  | Server-side CSV serialization.         |

## Testing

| Layer            | Tooling                          |
| ---------------- | -------------------------------- |
| Unit             | Vitest                           |
| API / integration| Supertest (+ Vitest)             |
| Component        | React Testing Library            |
| End-to-end       | Playwright                       |

## Code quality / tooling

- **ESLint** + **Prettier** for linting and formatting.
- **TypeScript** compiler (`tsc`) for type checking.

## Onboarding enablers note

The first-boot onboarding enablers (tooltips, coach marks, welcome mats) are
delivered via **React Joyride** and are automatically disabled once a production
database is configured and populated, per `ASSUMPTIONS.md` §2.

> Dependency versions are pinned in the respective `package.json` files at
> implementation time; prefer versions published at least a week prior to keep
> the supply chain safe.
