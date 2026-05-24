# Testing Strategy

## Overview

The Onboarding Diary application uses **Vitest** as the test runner across both backend and frontend packages, providing fast ES module–native test execution with TypeScript support out of the box.

| Package | Framework | Environment | Test Types |
|---------|-----------|-------------|------------|
| `apps/api` | Vitest + Supertest | Node | Unit, Integration |
| `apps/web` | Vitest + React Testing Library | jsdom | Component, Page |

## Running Tests

```bash
# Run all tests
pnpm test

# Run backend tests only
pnpm test:api

# Run frontend tests only
pnpm test:web

# Watch mode (backend)
cd apps/api && pnpm test:watch

# Watch mode (frontend)
cd apps/web && pnpm test:watch

# Coverage report
cd apps/api && pnpm test:coverage
cd apps/web && pnpm test:coverage
```

---

## Backend Testing

### Architecture

```
apps/api/src/
├── __mocks__/
│   └── prisma.ts          # Mock Prisma client with all models
├── __tests__/
│   ├── setup.ts            # Global test setup (mock config, env vars)
│   ├── helpers.ts           # Test factories, token generators
│   ├── unit/
│   │   ├── tasks.service.test.ts
│   │   ├── issues.service.test.ts
│   │   └── notes.service.test.ts
│   └── integration/
│       ├── auth.test.ts
│       └── tasks.test.ts
└── vitest.config.ts
```

### Mock Strategy

**Prisma Mock** (`src/__mocks__/prisma.ts`): A manually constructed mock that mirrors the Prisma client interface. Each model exposes vi.fn() stubs for `findUnique`, `findFirst`, `findMany`, `create`, `update`, `updateMany`, `delete`, `deleteMany`, `count`, `aggregate`, and `groupBy`. The `$transaction` mock handles both callback-style and array-style transactions.

**Config Mock** (`src/__tests__/setup.ts`): Mocks the config module with test-safe values (low bcrypt rounds, test JWT secrets, high rate limits) to avoid requiring real environment variables.

### Unit Tests

Service-layer tests that verify business logic in isolation:

- **Tasks Service**: CRUD operations, ownership checks, admin overrides, completedAt auto-set on status change, visibility-based access control for managers
- **Issues Service**: CRUD, resolvedAt tracking on status change, ownership enforcement
- **Notes Service**: CRUD, visibility scoping, mood rating handling

Key patterns:
```typescript
vi.mock('../../config/database.js', async () => {
  const { prismaMock } = await import('../../__mocks__/prisma.js');
  return { prisma: prismaMock };
});

// Dynamic import after mock registration
const { createTask } = await import('../../modules/tasks/tasks.service.js');
```

### Integration Tests

HTTP-level tests using Supertest against the Express app:

- **Auth API**: Registration (success, duplicate email, validation, password complexity), login (success, wrong password, non-existent user, inactive account), authenticated endpoints (me, logout), token validation
- **Tasks API**: CRUD operations through HTTP, authentication enforcement, authorization (owner vs admin vs manager), pagination, validation

Key patterns:
```typescript
const res = await request(app)
  .post('/api/v1/tasks')
  .set('Authorization', `Bearer ${token(recruitId, 'RECRUIT')}`)
  .send({ title: 'Test Task' });

expect(res.status).toBe(201);
expect(res.body.data).toHaveProperty('id');
```

### Test Data Factories

`helpers.ts` provides factories for creating test data:

| Factory | Creates |
|---------|---------|
| `createTestToken(user)` | JWT access token with `sub` and `role` claims |
| `adminToken()` / `managerToken()` / `recruitToken()` | Pre-built tokens for each role |
| `createMockTask(overrides)` | TaskEntry database record |
| `createMockIssue(overrides)` | IssueEntry database record |
| `createMockNote(overrides)` | NoteEntry database record |
| `createMockUser(overrides)` | User database record |
| `testUsers` | Static user identities (admin, manager, recruit) |

---

## Frontend Testing

### Architecture

```
apps/web/src/
├── __tests__/
│   ├── setup.ts             # jest-dom matchers for Vitest
│   ├── test-utils.tsx        # Custom render with providers
│   ├── components/
│   │   ├── Badge.test.tsx
│   │   ├── Button.test.tsx
│   │   ├── Card.test.tsx
│   │   ├── EmptyState.test.tsx
│   │   ├── Input.test.tsx
│   │   ├── Modal.test.tsx
│   │   └── Pagination.test.tsx
│   └── pages/
│       └── LoginPage.test.tsx
└── vitest.config.ts
```

### Test Utilities

**Custom render** (`test-utils.tsx`): Wraps components with `QueryClientProvider` (retry disabled, no GC) and `MemoryRouter` for routing context. All component tests import `render`, `screen`, `userEvent` from this file.

### Component Tests

Tests for the reusable UI component library:

| Component | Tests |
|-----------|-------|
| **Button** | Renders text, onClick handler, disabled state, loading state with spinner, variant classes (primary/secondary/danger), size classes |
| **Badge** | Renders children, default/success/danger variants, StatusBadge auto-mapping (COMPLETED→green, PENDING→yellow, CRITICAL→red), unknown status fallback |
| **Input** | Label rendering, error message display, error styling, user input handling |
| **Select** | Options rendering, label support |
| **Textarea** | Label rendering, error display |
| **Modal** | Hidden when closed, visible with title/content when open, close button callback |
| **Card** | Children rendering, custom className, CardHeader/CardContent composition |
| **StatCard** | Label + value display, optional subtext |
| **Pagination** | Page info text, disabled prev on first page, enabled next, page change callbacks, hidden for single page |
| **EmptyState** | Title, description, action button rendering |

### Page Tests

| Page | Tests |
|------|-------|
| **LoginPage** | Form rendering, validation errors on empty submit, error display on failed login, navigation on success, register link |

### Mocking Patterns

API modules are mocked at the module level:
```typescript
vi.mock('@/api/auth.api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    refresh: vi.fn().mockRejectedValue(new Error('no token')),
    logout: vi.fn(),
  },
}));
```

Navigation is mocked to verify routing:
```typescript
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
```

---

## Test Coverage Goals

| Layer | Target | Focus Areas |
|-------|--------|-------------|
| Backend services | 80%+ | Business logic, authorization, edge cases |
| Backend API routes | 70%+ | Auth flows, CRUD operations, validation |
| Frontend components | 90%+ | Rendering, interactions, accessibility |
| Frontend pages | 60%+ | Critical flows (login, form submission) |

## What's Tested

### Critical Flows
- ✓ User registration with validation
- ✓ Login with correct/incorrect credentials
- ✓ Token-based authentication and authorization
- ✓ Logout with refresh token revocation
- ✓ CRUD operations on tasks (create, read, update, delete)
- ✓ Role-based access control (RECRUIT, MANAGER, ADMIN)
- ✓ Ownership enforcement (users can only edit/delete own entries)
- ✓ Admin override capabilities
- ✓ Visibility-scoped access (PRIVATE, MANAGER_ONLY, PUBLIC)
- ✓ Soft delete behavior
- ✓ Auto-timestamp tracking (completedAt, resolvedAt)
- ✓ Input validation (required fields, min length, password complexity)
- ✓ Pagination metadata

### What's Not Tested (Future Work)
- Report generation (PDF/CSV export)
- Dashboard aggregation queries
- Feedback relationship enforcement
- Frontend page integration tests beyond login
- E2E tests with real database
- Performance/load testing

## Adding New Tests

### Backend Service Test
```typescript
// src/__tests__/unit/myfeature.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../../__mocks__/prisma.js';

vi.mock('../../config/database.js', () => ({
  prisma: prismaMock,
}));

const { myFunction } = await import('../../modules/myfeature/myfeature.service.js');

describe('MyFeature Service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should do something', async () => {
    prismaMock.myModel.create.mockResolvedValue({ id: '1' });
    const result = await myFunction({ ... });
    expect(result.id).toBe('1');
  });
});
```

### Frontend Component Test
```typescript
// src/__tests__/components/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import { MyComponent } from '@/components/ui/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent label="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```
