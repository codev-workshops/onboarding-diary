# Onboarding Diary - Implementation Plan

## Tech Stack Summary

| Layer      | Technology                                         |
|------------|----------------------------------------------------|
| Backend    | .NET 10 Web API, EF Core, SQL Server Express       |
| Auth       | JWT (Bearer tokens), Role-based authorization      |
| API Docs   | Swagger / Swashbuckle                              |
| Frontend   | React / Next.js (App Router), TypeScript            |
| Styling    | CSS Modules or Tailwind CSS (clean, minimal)       |
| Architecture | Monolithic, SOLID, layered separation            |

---

## Project Structure

```
onboarding-diary/
├── backend/
│   └── OnboardingDiary.Api/
│       ├── Controllers/          # API controllers (thin, delegate to services)
│       │   ├── AuthController.cs
│       │   ├── UsersController.cs
│       │   ├── TasksController.cs
│       │   ├── IssuesController.cs
│       │   ├── FeedbackController.cs
│       │   ├── NotesController.cs
│       │   ├── DashboardController.cs
│       │   ├── ReportsController.cs
│       │   └── AdminController.cs
│       ├── Services/             # Business logic interfaces + implementations
│       │   ├── IAuthService.cs / AuthService.cs
│       │   ├── ITaskService.cs / TaskService.cs
│       │   ├── IIssueService.cs / IssueService.cs
│       │   ├── IFeedbackService.cs / FeedbackService.cs
│       │   ├── INoteService.cs / NoteService.cs
│       │   ├── IDashboardService.cs / DashboardService.cs
│       │   ├── IReportService.cs / ReportService.cs
│       │   └── IAdminService.cs / AdminService.cs
│       ├── Repositories/         # Data access interfaces + implementations
│       │   ├── IRepository.cs    # Generic base repository interface
│       │   ├── Repository.cs     # Generic base implementation
│       │   ├── IUserRepository.cs / UserRepository.cs
│       │   ├── ITaskRepository.cs / TaskRepository.cs
│       │   ├── IIssueRepository.cs / IssueRepository.cs
│       │   ├── IFeedbackRepository.cs / FeedbackRepository.cs
│       │   └── INoteRepository.cs / NoteRepository.cs
│       ├── DTOs/                 # Request/Response models
│       │   ├── Auth/             # LoginRequest, RegisterRequest, AuthResponse
│       │   ├── Tasks/            # CreateTaskDto, UpdateTaskDto, TaskResponseDto
│       │   ├── Issues/           # CreateIssueDto, UpdateIssueDto, IssueResponseDto
│       │   ├── Feedback/         # CreateFeedbackDto, UpdateFeedbackDto, FeedbackResponseDto
│       │   ├── Notes/            # CreateNoteDto, UpdateNoteDto, NoteResponseDto
│       │   ├── Dashboard/        # DashboardDto, RecruitOverviewDto, SystemOverviewDto
│       │   ├── Reports/          # ReportRequestDto, ReportResponseDto
│       │   ├── Admin/            # CreateUserDto, UpdateUserDto, UserResponseDto
│       │   └── Common/           # PaginatedResponse<T>, PaginationParams, ErrorResponse
│       ├── Entities/             # EF Core entity classes
│       │   ├── User.cs
│       │   ├── TaskEntry.cs
│       │   ├── IssueEntry.cs
│       │   ├── FeedbackEntry.cs
│       │   ├── NoteEntry.cs
│       │   ├── NoteTag.cs        # Join table for note-tag relationship
│       │   ├── Department.cs
│       │   └── Category.cs
│       ├── Data/
│       │   ├── AppDbContext.cs   # EF Core DbContext with all DbSets
│       │   ├── Migrations/       # EF Core migrations
│       │   └── SeedData.cs       # Initial seed (admin user, default departments/categories)
│       ├── Auth/
│       │   ├── JwtSettings.cs    # JWT configuration POCO
│       │   ├── JwtTokenGenerator.cs
│       │   └── RoleRequirement.cs # Custom authorization policies
│       ├── Middleware/
│       │   ├── ExceptionMiddleware.cs    # Global error handling
│       │   └── ValidationMiddleware.cs   # Request validation
│       ├── Extensions/
│       │   ├── ServiceCollectionExtensions.cs  # DI registration
│       │   └── QueryableExtensions.cs          # Pagination, sorting helpers
│       ├── Program.cs
│       ├── appsettings.json
│       └── OnboardingDiary.Api.csproj
│
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── layout.tsx        # Root layout with sidebar/nav
│   │   │   ├── page.tsx          # Landing / redirect to dashboard
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── tasks/
│   │   │   │   ├── page.tsx      # Task list with filters
│   │   │   │   └── [id]/page.tsx # Task detail/edit
│   │   │   ├── issues/
│   │   │   ├── feedback/
│   │   │   ├── notes/
│   │   │   ├── reports/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── admin/
│   │   │       ├── users/page.tsx
│   │   │       ├── departments/page.tsx
│   │   │       └── categories/page.tsx
│   │   ├── components/
│   │   │   ├── ui/               # Reusable primitives (Button, Input, Modal, Table, etc.)
│   │   │   ├── layout/           # Sidebar, Navbar, Footer
│   │   │   ├── forms/            # EntryForm, FilterBar, etc.
│   │   │   └── dashboard/        # SummaryCard, ProgressBar, RecentEntries
│   │   ├── services/
│   │   │   └── api.ts            # Axios/fetch wrapper with JWT interceptor
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx    # Auth state, login/logout, token management
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript interfaces matching backend DTOs
│   │   └── utils/
│   │       ├── validators.ts     # Client-side validation helpers
│   │       └── formatters.ts     # Date/number formatting
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   └── tailwind.config.js        # (if using Tailwind)
│
├── REQUIREMENTS.md
└── README.md
```

---

## Implementation Phases

### Phase 1: Foundation (Sequential - Single Devin Session)

**Why sequential:** Everything in Phase 2+ depends on this. The project scaffold, database schema, auth system, and frontend shell must exist before any feature module can be built.

**Estimated effort:** ~1 Devin session

#### Step 1.1 - Backend Scaffold
- `dotnet new webapi` with .NET 10
- Add NuGet packages: `Microsoft.EntityFrameworkCore.SqlServer`, `Microsoft.AspNetCore.Authentication.JwtBearer`, `Swashbuckle.AspNetCore`, `BCrypt.Net-Next`
- Configure `Program.cs`: Swagger, CORS, JWT auth, EF Core DI, JSON serialization (camelCase, enums as strings)
- Create `appsettings.json` with connection string (SQL Server Express LocalDB), JWT settings

#### Step 1.2 - Entities & Database
- Create ALL entity classes (User, TaskEntry, IssueEntry, FeedbackEntry, NoteEntry, NoteTag, Department, Category)
- Create `AppDbContext` with all `DbSet<>` declarations and `OnModelCreating` configuration (indexes, relationships, enum conversions)
- Create initial EF Core migration
- Create `SeedData.cs` to seed: 1 admin user, default departments, default task categories
- Run migration to verify schema

#### Step 1.3 - Shared Infrastructure
- Generic `IRepository<T>` / `Repository<T>` base (CRUD + queryable)
- `PaginatedResponse<T>`, `PaginationParams`, `ErrorResponse` DTOs
- `QueryableExtensions` for pagination and sorting
- `ExceptionMiddleware` for global error handling (returns structured JSON errors)
- `ServiceCollectionExtensions` for clean DI registration

#### Step 1.4 - Authentication & Authorization
- `JwtTokenGenerator` (generates access tokens with userId, email, role claims)
- `AuthService` (register, login, password hashing with BCrypt)
- `AuthController` (`POST /api/auth/register`, `POST /api/auth/login`)
- JWT middleware configuration in `Program.cs`
- Role-based authorization policies: `RequireRecruit`, `RequireManager`, `RequireAdmin`
- `UserRepository` for user lookups

#### Step 1.5 - User Profile Endpoints
- `UsersController` with `GET /api/users/me`, `PUT /api/users/me`, `PUT /api/users/me/password`
- Profile DTOs

#### Step 1.6 - Frontend Scaffold
- `npx create-next-app` with TypeScript, App Router
- Install dependencies: axios (or use fetch), tailwindcss (or CSS modules)
- Set up project structure (directories for components, services, contexts, types)
- Create `api.ts` service with base URL config, JWT token interceptor (reads from localStorage), response/error handling
- Create `AuthContext.tsx` (login, logout, current user state, route protection)
- Create layout components: `Sidebar` (navigation links per role), `Navbar` (user info, logout)
- Build Login page (form, validation, API call, redirect)
- Build Register page (form with all fields, validation, API call)
- Create reusable UI components: `Button`, `Input`, `Select`, `DatePicker`, `Modal`, `Table`, `Toast`
- Protected route wrapper (redirects to login if no token)

#### Step 1.7 - Verify End-to-End
- Start backend, verify Swagger UI works
- Start frontend, verify login/register flow works end-to-end
- Confirm JWT token is stored and sent on subsequent requests

**Deliverable:** PR with working auth flow (register -> login -> see empty dashboard shell) + Swagger docs

---

### Phase 2: Core CRUD Modules + Admin (Parallelizable - Up to 5 Devin Sessions)

**Why parallel:** Each module is structurally identical (Controller + Service + Repository + DTOs + frontend pages). They only add NEW files and don't modify Phase 1 files (entities/DbContext/migrations are already done). Merge conflicts will be minimal (only in navigation menu and route definitions).

**Prerequisite:** Phase 1 PR must be merged into `intermediate_session_mode`.

#### Session A: Task Entries (Full Stack)
**Backend:**
- `TaskRepository` (extends generic repo, adds filter-by-date/category/status/priority queries)
- `TaskService` (CRUD logic, ownership checks, role-scoped queries)
- `TasksController` (5 endpoints: GET list, GET by id, POST, PUT, DELETE)
- DTOs: `CreateTaskDto`, `UpdateTaskDto`, `TaskResponseDto`

**Frontend:**
- Tasks list page with filter bar (date range, category, status, priority dropdowns)
- Create/Edit task modal or page
- Delete confirmation dialog
- Pagination controls
- Add "Tasks" link to sidebar navigation

**User stories covered:** US-010 through US-014

---

#### Session B: Issue Entries (Full Stack)
**Backend:**
- `IssueRepository` (filter by status, severity, date)
- `IssueService` (CRUD, ownership, conditional validation: resolutionNotes required when RESOLVED/CLOSED)
- `IssuesController` (5 endpoints)
- DTOs: `CreateIssueDto`, `UpdateIssueDto`, `IssueResponseDto`

**Frontend:**
- Issues list page with filters (status, severity)
- Create/Edit issue form (resolution notes field conditionally required)
- Delete confirmation
- Add "Issues" link to sidebar

**User stories covered:** US-020 through US-024

---

#### Session C: Feedback Entries (Full Stack)
**Backend:**
- `FeedbackRepository` (filter by type, date)
- `FeedbackService` (CRUD, ownership)
- `FeedbackController` (5 endpoints)
- DTOs: `CreateFeedbackDto`, `UpdateFeedbackDto`, `FeedbackResponseDto`

**Frontend:**
- Feedback list page with type filter
- Create/Edit feedback form (radio buttons for type)
- Delete confirmation
- Add "Feedback" link to sidebar

**User stories covered:** US-030 through US-033

---

#### Session D: Note Entries (Full Stack)
**Backend:**
- `NoteRepository` (filter by tags, date; handle NoteTag join table)
- `NoteService` (CRUD, ownership, tag management - dedupe, lowercase, limit 10)
- `NotesController` (5 endpoints)
- DTOs: `CreateNoteDto`, `UpdateNoteDto`, `NoteResponseDto`

**Frontend:**
- Notes list page (card layout) with tag filter (multi-select)
- Create/Edit note form with tag input component (type + Enter to add, X to remove)
- Delete confirmation
- Add "Notes" link to sidebar

**User stories covered:** US-040 through US-044

---

#### Session E: Admin Features (Full Stack)
**Backend:**
- `AdminService` (user CRUD, activate/deactivate, assign manager, department/category CRUD)
- `AdminController` (user management: 6 endpoints; departments: 4 endpoints; categories: 4 endpoints)
- DTOs: `CreateUserDto`, `UpdateUserDto`, `UserResponseDto`, `DepartmentDto`, `CategoryDto`
- All endpoints restricted to ADMIN role

**Frontend:**
- Admin user management page (table with search/filter, create/edit forms, deactivate toggle, assign manager dropdown)
- Admin departments page (simple CRUD table)
- Admin categories page (simple CRUD table)
- Admin section in sidebar (visible only to ADMIN role)

**User stories covered:** US-070 through US-074

---

### Merge Strategy for Phase 2

Each parallel session creates its own feature branch off `intermediate_session_mode`:
```
intermediate_session_mode
  ├── feature/task-entries      (Session A)
  ├── feature/issue-entries     (Session B)
  ├── feature/feedback-entries  (Session C)
  ├── feature/note-entries      (Session D)
  └── feature/admin-features    (Session E)
```

**Merge order recommendation:** Merge them one at a time. After each merge, rebase the remaining branches. Likely conflict points:
- `Sidebar.tsx` (each adds a nav link) - trivial to resolve
- `frontend/src/types/index.ts` (each adds type definitions) - trivial, just append
- No backend conflicts expected (all new files)

---

### Phase 3: Dashboard & Reports (Parallelizable - 2 Devin Sessions)

**Prerequisite:** All Phase 2 PRs must be merged (dashboards and reports aggregate data from all entry types).

#### Session F: Dashboard (Full Stack)
**Backend:**
- `DashboardService` (aggregate queries across all entry tables)
  - Recruit dashboard: counts, completion %, recent entries from all tables
  - Manager dashboard: list assigned recruits with summary stats
  - Admin dashboard: system-wide counts, recent activity
- `DashboardController` (3 endpoints: `/api/dashboard`, `/api/dashboard/recruits`, `/api/dashboard/system`)
- DTOs: `DashboardSummaryDto`, `RecruitOverviewDto`, `SystemOverviewDto`, `RecentEntryDto`

**Frontend:**
- Recruit dashboard: summary cards (total tasks, completed, open issues, feedback count, notes count), progress bar, recent entries table
- Manager dashboard: recruit list table with metrics, click-to-drill-down
- Admin dashboard: user/entry counts, recent activity feed
- Role-based rendering (show appropriate dashboard based on user role)
- This becomes the default landing page after login

**User stories covered:** US-050 through US-052

---

#### Session G: Reports & Export (Full Stack)
**Backend:**
- `ReportService` (query entries by date range and category, aggregate stats)
- PDF generation (use `QuestPDF` or `iTextSharp` NuGet package)
- CSV generation (use `CsvHelper` NuGet package)
- `ReportsController` (2 endpoints: `GET /api/reports` preview, `GET /api/reports/download`)
- DTOs: `ReportRequestDto`, `ReportResponseDto`, `ReportSectionDto`

**Frontend:**
- Reports page: date range pickers, category dropdown, recruit selector (Manager/Admin only)
- "Generate Preview" button -> renders report on-screen in formatted sections
- "Download PDF" / "Download CSV" buttons (trigger file download)

**User stories covered:** US-060 through US-062

---

### Phase 4: Polish & Integration (Sequential - Single Devin Session)

**Prerequisite:** Phases 1-3 merged.

#### Step 4.1 - Password Reset Flow
- Backend: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- For simplicity: generate a reset token, store it in the User entity (with expiry), log the reset link to console (skip actual email sending unless an SMTP service is configured)
- Frontend: Forgot Password page, Reset Password page

#### Step 4.2 - Final Integration & Cleanup
- End-to-end manual testing of all flows
- Fix any cross-module bugs
- Verify role-based access control across all endpoints
- Verify responsive layout at all breakpoints
- Add loading states and error handling to all frontend pages
- Review and clean up any TODO comments

**User stories covered:** US-005

---

## Dependency Graph (Visual)

```
Phase 1: FOUNDATION (sequential)
    │
    │  Project scaffold, ALL entities, DbContext, migrations,
    │  JWT auth, Swagger, frontend shell, login/register
    │
    ▼
Phase 2: CRUD MODULES + ADMIN (up to 5 parallel sessions)
    │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  │ Session A│ │ Session B│ │ Session C│ │ Session D│ │ Session E│
    │  │  Tasks   │ │  Issues  │ │ Feedback │ │  Notes   │ │  Admin   │
    │  │ (full    │ │ (full    │ │ (full    │ │ (full    │ │ (full    │
    │  │  stack)  │ │  stack)  │ │  stack)  │ │  stack)  │ │  stack)  │
    │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
    │       └─────────┬──┴────────┬───┴─────────┬──┘            │
    │                 ▼           ▼              ▼               │
    │            Merge sequentially, rebase remaining            │
    │                         │                                  │
    ▼                         ▼                                  ▼
Phase 3: DASHBOARD & REPORTS (2 parallel sessions)
    │
    │  ┌──────────────┐  ┌──────────────────┐
    │  │  Session F   │  │   Session G      │
    │  │  Dashboard   │  │   Reports +      │
    │  │  (3 views)   │  │   PDF/CSV Export  │
    │  └──────┬───────┘  └────────┬─────────┘
    │         └──────┬────────────┘
    │                ▼
    ▼
Phase 4: POLISH (sequential)
    │
    │  Password reset, integration testing,
    │  responsive fixes, error handling
    │
    ▼
    DONE - Core app complete, ready for Step 3 extensions
```

---

## Parallelization Summary

| Phase   | Sessions | Parallel? | Depends On | Key Deliverables                      |
|---------|----------|-----------|------------|---------------------------------------|
| Phase 1 | 1        | No        | -          | Auth, DB, scaffold, frontend shell    |
| Phase 2 | Up to 5  | **Yes**   | Phase 1    | Tasks, Issues, Feedback, Notes, Admin |
| Phase 3 | 2        | **Yes**   | Phase 2    | Dashboard, Reports + Export           |
| Phase 4 | 1        | No        | Phase 3    | Password reset, polish, testing       |

**Total sessions: 9 (but only 4 sequential steps thanks to parallelization)**

Without parallelization you'd need 9 sequential sessions. With parallelization the critical path is:

```
Phase 1 (1 session) → Phase 2 (1 session-time, 5 parallel) → Phase 3 (1 session-time, 2 parallel) → Phase 4 (1 session)
= 4 sequential steps instead of 9
```

---

## Key Design Decisions

### Backend Patterns
1. **Generic Repository** - `IRepository<T>` with `GetAll`, `GetById`, `Add`, `Update`, `Delete`, `Query` (IQueryable). Specific repositories extend for custom queries.
2. **Service Layer** - All business logic in services. Controllers are thin (validate request, call service, return response). Services handle ownership checks, role scoping, and validation.
3. **DTOs everywhere** - Never expose entities directly. Separate Create/Update/Response DTOs per entity.
4. **FluentValidation** (optional) or Data Annotations for request validation.
5. **AutoMapper** or manual mapping between entities and DTOs (recommend manual for simplicity and clarity).

### Frontend Patterns
1. **API service layer** - Single `api.ts` with typed methods. Axios interceptor adds JWT token and handles 401 (redirect to login).
2. **AuthContext** - React context for login state, user info, role-based rendering.
3. **Reusable form components** - Shared `EntryForm` pattern: all 4 entry types use similar create/edit modals.
4. **Table + Filter pattern** - Shared `FilterableTable` component used across Tasks, Issues, Feedback, Notes.

### Simplification Decisions (per "avoid unnecessary complexity")
- **No refresh tokens** - JWT only, 24-hour expiry. User re-logs after expiry.
- **No real email sending** - Password reset token logged to console / returned in dev mode.
- **No file uploads** - Text-only entries.
- **No real-time updates** - Standard request/response, no WebSockets.
- **No caching layer** - Direct DB queries (sufficient for this scale).
- **Manual DTO mapping** - No AutoMapper dependency; explicit mapping methods on DTOs or in services.
