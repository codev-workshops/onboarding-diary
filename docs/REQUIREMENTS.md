# Onboarding Diary Application — Detailed Requirements

A web application for new recruits to document their onboarding journey. Users log daily tasks, record issues, provide feedback, and capture notes. Managers can view entries and generate downloadable reports.

**Tech Stack:** Java 17 + Spring Boot 3.x (backend), React + TypeScript + Vite (frontend), PostgreSQL 16, Docker Compose

---

## Table of Contents

1. [User Roles & Permissions](#1-user-roles--permissions)
2. [User Stories](#2-user-stories)
3. [API Endpoints](#3-api-endpoints)
4. [Database Schema](#4-database-schema)
5. [UI Flow](#5-ui-flow)
6. [Validation Rules](#6-validation-rules)
7. [Technical Architecture](#7-technical-architecture)
8. [Suggested Extension Features](#8-suggested-extension-features)

---

## 1. User Roles & Permissions

| Role | Permissions |
|------|------------|
| **New Recruit** | Create/edit/delete own tasks, issues, feedback, and notes. View own dashboard. Generate own reports. |
| **Manager** | All recruit permissions + view entries of assigned recruits + generate reports for assigned recruits + manager dashboard. |
| **Admin** | All manager permissions + manage all users (CRUD) + assign recruits to managers + assign roles + view all data across all users. |

### Manager-Recruit Assignment Model

- Admins manually assign recruits to managers via the user management interface.
- A recruit has at most one assigned manager (`manager_id` on the user record).
- A manager can oversee multiple recruits.
- Managers can only view data for recruits explicitly assigned to them.

---

## 2. User Stories

### 2.1 Authentication & Profile

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|-------------------|
| US-AUTH-01 | New Recruit | As a new recruit, I want to sign up with my email and password so that I can create an account. | Email must be unique. Password meets complexity rules. Role defaults to `recruit`. Redirects to login on success. |
| US-AUTH-02 | Any User | As a user, I want to log in with email and password so that I can access the app. | Returns JWT access token. Shows error on invalid credentials. |
| US-AUTH-03 | Any User | As a user, I want to update my profile (name, department, start date) so that my info stays current. | Only editable fields are name, department, start_date. Role is read-only for non-admins. |
| US-AUTH-04 | Any User | As a user, I want to log out so that my session is securely ended. | Token is invalidated on the client side. Redirects to login page. |

### 2.2 Task Log

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|-------------------|
| US-TASK-01 | Recruit | As a recruit, I want to create a task entry with date, title, description, category, status, and priority. | All required fields validated. Task appears in list immediately. |
| US-TASK-02 | Recruit | As a recruit, I want to edit an existing task entry. | Only the owner can edit. Updated_at timestamp refreshed. |
| US-TASK-03 | Recruit | As a recruit, I want to delete a task entry. | Confirmation dialog shown. Only the owner can delete. |
| US-TASK-04 | Recruit | As a recruit, I want to filter tasks by date range, category, or status. | Filters combinable. Results paginated. |
| US-TASK-05 | Manager | As a manager, I want to view task entries for recruits I oversee. | Only sees assigned recruits' tasks. Read-only access. |

### 2.3 Issue Log

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|-------------------|
| US-ISSUE-01 | Recruit | As a recruit, I want to log an issue with date, title, description, severity, status, and resolution notes. | All required fields validated. |
| US-ISSUE-02 | Recruit | As a recruit, I want to edit an issue (update status, add resolution notes). | Resolution notes required when status is `resolved` or `closed`. |
| US-ISSUE-03 | Recruit | As a recruit, I want to delete an issue entry. | Confirmation dialog. Owner-only. |
| US-ISSUE-04 | Recruit | As a recruit, I want to filter issues by status or severity. | Filters combinable with date range. |
| US-ISSUE-05 | Manager | As a manager, I want to view issues logged by recruits I oversee. | Read-only. Helps identify blockers. |

### 2.4 Feedback Notes

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|-------------------|
| US-FB-01 | Recruit | As a recruit, I want to submit feedback with date, subject, type, and details. | Type is one of: Positive, Suggestion, Concern. |
| US-FB-02 | Recruit | As a recruit, I want to edit or delete my feedback entries. | Owner-only access. |
| US-FB-03 | Manager | As a manager, I want to view feedback from my assigned recruits. | Read-only. |

### 2.5 Additional Notes

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|-------------------|
| US-NOTE-01 | Recruit | As a recruit, I want to create free-form notes with date, title, content, and tags. | Max 10 tags per note. |
| US-NOTE-02 | Recruit | As a recruit, I want to edit or delete my notes. | Owner-only. |
| US-NOTE-03 | Recruit | As a recruit, I want to filter notes by tags. | Multi-tag filter supported. |

### 2.6 Dashboard

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|-------------------|
| US-DASH-01 | Recruit | As a recruit, I want a dashboard with summary counts (tasks, issues, feedback, notes). | Counts are accurate and real-time. |
| US-DASH-02 | Recruit | As a recruit, I want to see recent entries across all categories. | Shows last 5 entries per category. |
| US-DASH-03 | Recruit | As a recruit, I want to see task completion progress and open issue count. | Visual progress bar for tasks. |
| US-DASH-04 | Manager | As a manager, I want a dashboard showing aggregate stats for my assigned recruits. | Can drill down by selecting a specific recruit. |

### 2.7 Reports

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|-------------------|
| US-RPT-01 | Recruit | As a recruit, I want to generate a report by date range (tasks, issues, feedback, or combined). | Date range max 365 days. |
| US-RPT-02 | Recruit | As a recruit, I want to download reports as PDF or CSV. | File downloads immediately. |
| US-RPT-03 | Manager | As a manager, I want to generate reports for recruits I oversee. | Can select specific recruit. |

### 2.8 Admin

| ID | Role | Story | Acceptance Criteria |
|----|------|-------|-------------------|
| US-ADM-01 | Admin | As an admin, I want to view a list of all users. | Paginated, filterable by role and status. |
| US-ADM-02 | Admin | As an admin, I want to create, edit, or deactivate user accounts. | Deactivation is soft-delete (is_active flag). |
| US-ADM-03 | Admin | As an admin, I want to assign roles to users. | Role changes take effect immediately. |
| US-ADM-04 | Admin | As an admin, I want to assign recruits to managers. | Only users with `manager` role can be assigned. |
| US-ADM-05 | Admin | As an admin, I want to view all data across all users. | Full read access to all entries. |

---

## 3. API Endpoints

Base URL: `/api/v1`

All authenticated endpoints require `Authorization: Bearer <token>` header.

### 3.1 Authentication

| Method | Path | Description | Auth | Request Body | Success Response |
|--------|------|-------------|------|-------------|-----------------|
| POST | `/auth/register` | Register new user | No | `{ email, password, fullName, department?, startDate? }` | `201 { id, email, fullName, role }` |
| POST | `/auth/login` | Login | No | `{ email, password }` | `200 { accessToken, tokenType, user: {...} }` | |

### 3.2 User Profile

| Method | Path | Description | Auth | Request/Query | Success Response |
|--------|------|-------------|------|-------------|-----------------|
| GET | `/users/me` | Get current user profile | Yes | — | `200 { id, email, fullName, role, department, startDate, isActive }` |
| PUT | `/users/me` | Update current user profile | Yes | `{ fullName?, department?, startDate? }` | `200 { ...updatedUser }` |
| GET | `/users` | List all users | Admin | `?role=&isActive=&page=&size=` | `200 { content: [...], totalElements, totalPages, ... }` |
| GET | `/users/{userId}` | Get user by ID | Admin | — | `200 { ...user }` |
| PUT | `/users/{userId}` | Update user (role, status, manager) | Admin | `{ role?, isActive?, managerId? }` | `200 { ...updatedUser }` |
| POST | `/users` | Create user | Admin | `{ email, password, fullName, role, department?, startDate? }` | `201 { ...user }` |

### 3.3 Task Log

| Method | Path | Description | Auth | Request/Query | Success Response |
|--------|------|-------------|------|-------------|-----------------|
| POST | `/tasks` | Create task | Recruit | `{ date, title, description?, category, status, priority }` | `201 { ...task }` |
| GET | `/tasks` | List own tasks | Yes | `?dateFrom=&dateTo=&category=&status=&page=&size=` | `200 { content: [...], totalElements, ... }` |
| GET | `/tasks/{taskId}` | Get single task | Yes (Owner/Manager/Admin) | — | `200 { ...task }` |
| PUT | `/tasks/{taskId}` | Update task | Owner | `{ title?, description?, category?, status?, priority? }` | `200 { ...task }` |
| DELETE | `/tasks/{taskId}` | Delete task | Owner | — | `204` |
| GET | `/users/{userId}/tasks` | List user's tasks | Manager/Admin | Same query params | `200 { content: [...], ... }` |

### 3.4 Issue Log

| Method | Path | Description | Auth | Request/Query | Success Response |
|--------|------|-------------|------|-------------|-----------------|
| POST | `/issues` | Create issue | Recruit | `{ date, title, description, severity, status, resolutionNotes? }` | `201 { ...issue }` |
| GET | `/issues` | List own issues | Yes | `?status=&severity=&dateFrom=&dateTo=&page=&size=` | `200 { content: [...], ... }` |
| GET | `/issues/{issueId}` | Get single issue | Yes (Owner/Manager/Admin) | — | `200 { ...issue }` |
| PUT | `/issues/{issueId}` | Update issue | Owner | `{ title?, description?, severity?, status?, resolutionNotes? }` | `200 { ...issue }` |
| DELETE | `/issues/{issueId}` | Delete issue | Owner | — | `204` |
| GET | `/users/{userId}/issues` | List user's issues | Manager/Admin | Same query params | `200 { content: [...], ... }` |

### 3.5 Feedback

| Method | Path | Description | Auth | Request/Query | Success Response |
|--------|------|-------------|------|-------------|-----------------|
| POST | `/feedback` | Submit feedback | Recruit | `{ date, subject, type, details }` | `201 { ...feedback }` |
| GET | `/feedback` | List own feedback | Yes | `?type=&dateFrom=&dateTo=&page=&size=` | `200 { content: [...], ... }` |
| GET | `/feedback/{feedbackId}` | Get single feedback | Yes (Owner/Manager/Admin) | — | `200 { ...feedback }` |
| PUT | `/feedback/{feedbackId}` | Update feedback | Owner | `{ subject?, type?, details? }` | `200 { ...feedback }` |
| DELETE | `/feedback/{feedbackId}` | Delete feedback | Owner | — | `204` |
| GET | `/users/{userId}/feedback` | List user's feedback | Manager/Admin | Same query params | `200 { content: [...], ... }` |

### 3.6 Notes

| Method | Path | Description | Auth | Request/Query | Success Response |
|--------|------|-------------|------|-------------|-----------------|
| POST | `/notes` | Create note | Recruit | `{ date, title, content, tags? }` | `201 { ...note }` |
| GET | `/notes` | List own notes | Yes | `?tags=&dateFrom=&dateTo=&page=&size=` | `200 { content: [...], ... }` |
| GET | `/notes/{noteId}` | Get single note | Yes (Owner/Manager/Admin) | — | `200 { ...note }` |
| PUT | `/notes/{noteId}` | Update note | Owner | `{ title?, content?, tags? }` | `200 { ...note }` |
| DELETE | `/notes/{noteId}` | Delete note | Owner | — | `204` |

### 3.7 Dashboard

| Method | Path | Description | Auth | Response |
|--------|------|-------------|------|----------|
| GET | `/dashboard` | Get recruit dashboard data | Yes | `200 { summary: { totalTasks, completedTasks, openIssues, totalFeedback, totalNotes }, recentTasks: [...], recentIssues: [...], recentFeedback: [...], recentNotes: [...], taskCompletionRate: float }` |
| GET | `/dashboard/manager` | Get manager dashboard | Manager | `200 { recruits: [...], aggregateSummary: {...} }` |

### 3.8 Reports

| Method | Path | Description | Auth | Request/Query | Response |
|--------|------|-------------|------|-------------|----------|
| POST | `/reports/generate` | Generate a report | Yes | `{ dateFrom, dateTo, reportType, format, userId? }` | `200 { reportId, downloadUrl }` |
| GET | `/reports/{reportId}/download` | Download report file | Yes | — | `200 (binary: PDF or CSV)` |
| GET | `/reports` | List generated reports | Yes | `?page=&size=` | `200 { content: [...], ... }` |

### 3.9 Error Response Format

All errors follow a consistent structure:

```json
{
  "timestamp": "2026-05-22T12:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "fieldErrors": [
    { "field": "email", "message": "must be a valid email address" }
  ]
}
```

| Status Code | Usage |
|-------------|-------|
| 400 | Validation errors |
| 401 | Missing or invalid token |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate email) |
| 500 | Internal server error |

### 3.10 Enums

| Enum | Values |
|------|--------|
| Role | `RECRUIT`, `MANAGER`, `ADMIN` |
| TaskStatus | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `ON_HOLD` |
| TaskPriority | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| TaskCategory | `TRAINING`, `DOCUMENTATION`, `MEETING`, `SETUP`, `DEVELOPMENT`, `OTHER` |
| IssueSeverity | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| IssueStatus | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| FeedbackType | `POSITIVE`, `SUGGESTION`, `CONCERN` |
| ReportType | `TASKS`, `ISSUES`, `FEEDBACK`, `COMBINED` |
| ReportFormat | `PDF`, `CSV` |

---

## 4. Database Schema

### 4.1 Entity Relationship Diagram

```
users 1───┐
           ├──< tasks
           ├──< issues
           ├──< feedback
           ├──< notes
           ├──< reports (generated_by)
           ├──< reports (target_user_id)
           └──1 users (manager_id → users.id)
```

### 4.2 Table Definitions

#### `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| password_hash | VARCHAR(255) | NOT NULL | BCrypt-hashed password |
| full_name | VARCHAR(150) | NOT NULL | Display name |
| role | VARCHAR(20) | NOT NULL, CHECK IN ('RECRUIT','MANAGER','ADMIN') | User role |
| department | VARCHAR(100) | NULL | Department name |
| start_date | DATE | NULL | Onboarding start date |
| manager_id | UUID | FK → users.id, NULL | Assigned manager (for recruits) |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | Account active flag |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

#### `tasks`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| user_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | Owner |
| date | DATE | NOT NULL | Task date |
| title | VARCHAR(200) | NOT NULL | Task title |
| description | TEXT | NULL | Task description |
| category | VARCHAR(30) | NOT NULL | Task category |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'NOT_STARTED' | Task status |
| priority | VARCHAR(10) | NOT NULL, DEFAULT 'MEDIUM' | Task priority |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

#### `issues`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| user_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | Owner |
| date | DATE | NOT NULL | Issue date |
| title | VARCHAR(200) | NOT NULL | Issue title |
| description | TEXT | NOT NULL | Issue description |
| severity | VARCHAR(10) | NOT NULL | Severity level |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'OPEN' | Issue status |
| resolution_notes | TEXT | NULL | How the issue was resolved |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

#### `feedback`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| user_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | Owner |
| date | DATE | NOT NULL | Feedback date |
| subject | VARCHAR(200) | NOT NULL | Feedback subject |
| type | VARCHAR(20) | NOT NULL | Feedback type |
| details | TEXT | NOT NULL | Feedback details |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

#### `notes`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| user_id | UUID | FK → users.id, NOT NULL, ON DELETE CASCADE | Owner |
| date | DATE | NOT NULL | Note date |
| title | VARCHAR(200) | NOT NULL | Note title |
| content | TEXT | NOT NULL | Note content |
| tags | TEXT | NULL | Comma-separated tags (or stored as JSON array) |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

#### `reports`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Primary key |
| generated_by | UUID | FK → users.id, NOT NULL | User who generated the report |
| target_user_id | UUID | FK → users.id, NULL | Recruit the report is about (NULL = self) |
| date_from | DATE | NOT NULL | Report start date |
| date_to | DATE | NOT NULL | Report end date |
| report_type | VARCHAR(20) | NOT NULL | Report category |
| format | VARCHAR(5) | NOT NULL | Download format |
| file_path | VARCHAR(500) | NOT NULL | Path to generated file |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Generation timestamp |

### 4.3 Indexes

```sql
CREATE INDEX idx_users_manager_id ON users(manager_id);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_date ON tasks(date);
CREATE INDEX idx_tasks_status ON tasks(status);

CREATE INDEX idx_issues_user_id ON issues(user_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_severity ON issues(severity);

CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_type ON feedback(type);

CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_date ON notes(date);

CREATE INDEX idx_reports_generated_by ON reports(generated_by);
CREATE INDEX idx_reports_target_user_id ON reports(target_user_id);
```

---

## 5. UI Flow

### 5.1 Page Map

```
/login ──────────────────────────────────────────────────┐
/register ───────────────────────────────────────────────┤
                                                         ▼
                                                   /dashboard
                                                    (Home)
                                        ┌──────┬─────┼─────┬──────┐
                                        ▼      ▼     ▼     ▼      ▼
                                     /tasks  /issues /feedback /notes /reports
                                        │      │     │      │
                                     /new   /new   (modal) /new
                                     /:id/edit  /:id/edit   /:id/edit
                                                                    │
                                                              /admin/users (Admin)
                                                              /profile
```

### 5.2 Screen-by-Screen Flow

#### Login Page (`/login`)
- Email and password fields
- "Sign Up" link → `/register`
- On success → redirect to `/dashboard`

#### Registration Page (`/register`)
- Fields: Full Name, Email, Password, Confirm Password, Department, Start Date
- Role defaults to `recruit` (admin assigns roles later)
- On success → redirect to `/login` with success message

#### Dashboard (`/dashboard`)
- **Top bar:** App logo, user name, role badge, logout button, profile link
- **Side navigation:** Dashboard, Tasks, Issues, Feedback, Notes, Reports, Admin (if admin)
- **Summary cards:** Total Tasks, Completed Tasks, Open Issues, Total Feedback, Total Notes
- **Task completion progress bar:** visual percentage of completed vs total tasks
- **Recent entries section:** Last 5 entries from each category in tabbed layout
- **Manager view (if role=manager):** Dropdown to select a recruit → shows their summary

#### Task Log (`/tasks`)
- **List view:** Table with columns: Date, Title, Category, Status, Priority, Actions (Edit/Delete)
- **Filters bar:** Date range picker, category dropdown, status dropdown
- **"+ New Task" button** → form page or modal
- **Edit page** — pre-filled form
- **Delete** — confirmation dialog

#### Issue Log (`/issues`)
- **List view:** Table with columns: Date, Title, Severity, Status, Actions
- **Filters bar:** Status dropdown, severity dropdown, date range
- **Severity badges** color-coded: Low (green), Medium (yellow), High (orange), Critical (red)

#### Feedback (`/feedback`)
- **List view:** Cards with type badges (Positive/Suggestion/Concern)
- **Filters:** Type dropdown, date range
- **Create/Edit** via modal or inline form

#### Notes (`/notes`)
- **List view:** Cards showing title, date, tags (as chips), truncated content
- **Filter:** Tag multi-select, date range
- **Create/Edit** form with tags input

#### Reports (`/reports`)
- **Generate form:** Date range, report type, format (PDF/CSV), recruit selector (managers)
- **Report history:** Table with previously generated reports + download links

#### Admin — User Management (`/admin/users`)
- **User list table:** Name, Email, Role, Department, Status, Manager, Actions
- **Edit user:** Change role, assign manager, activate/deactivate

#### Profile (`/profile`)
- View/edit: Full Name, Department, Start Date
- Change Password section (stretch)
- View role (read-only)

### 5.3 Responsive Behavior

- **Desktop (≥1024px):** Side navigation always visible, content fills remaining width
- **Tablet (768–1023px):** Collapsible side navigation (hamburger), full-width content
- **Mobile (<768px):** Bottom navigation bar, single-column layout, stacked cards

---

## 6. Validation Rules

### 6.1 Authentication

| Field | Rules |
|-------|-------|
| email | Required, valid email format, max 255 chars, unique on registration |
| password | Required, min 8 chars, max 128 chars, at least 1 uppercase + 1 lowercase + 1 digit + 1 special char |
| confirmPassword | Required (registration), must match password |
| fullName | Required, min 2 chars, max 150 chars |

### 6.2 Task Entry

| Field | Rules |
|-------|-------|
| date | Required, valid date, cannot be more than 7 days in the future |
| title | Required, min 3 chars, max 200 chars |
| description | Optional, max 5000 chars |
| category | Required, must be valid TaskCategory enum |
| status | Required, must be valid TaskStatus enum |
| priority | Required, must be valid TaskPriority enum |

### 6.3 Issue Entry

| Field | Rules |
|-------|-------|
| date | Required, valid date, cannot be more than 7 days in the future |
| title | Required, min 3 chars, max 200 chars |
| description | Required, min 10 chars, max 5000 chars |
| severity | Required, must be valid IssueSeverity enum |
| status | Required, must be valid IssueStatus enum |
| resolutionNotes | Optional (required when status is RESOLVED or CLOSED), max 5000 chars |

### 6.4 Feedback Entry

| Field | Rules |
|-------|-------|
| date | Required, valid date, cannot be more than 7 days in the future |
| subject | Required, min 3 chars, max 200 chars |
| type | Required, must be valid FeedbackType enum |
| details | Required, min 10 chars, max 5000 chars |

### 6.5 Note Entry

| Field | Rules |
|-------|-------|
| date | Required, valid date, cannot be more than 7 days in the future |
| title | Required, min 3 chars, max 200 chars |
| content | Required, min 1 char, max 10000 chars |
| tags | Optional, array of strings, max 10 tags, each tag max 30 chars, alphanumeric and hyphens only |

### 6.6 Report Generation

| Field | Rules |
|-------|-------|
| dateFrom | Required, valid date |
| dateTo | Required, valid date, must be ≥ dateFrom, range max 365 days |
| reportType | Required, must be valid ReportType enum |
| format | Required, must be valid ReportFormat enum |
| userId | Optional (Manager/Admin only), must reference an existing recruit the requester oversees |

### 6.7 General API Rules

| Rule | Details |
|------|---------|
| Pagination | `page` ≥ 0 (default: 0), `size` 1–100 (default: 20) — uses Spring Data conventions |
| UUID params | Must be valid UUID format |
| Authorization | Recruits → own data only; Managers → own + assigned recruits; Admins → all |

---

## 7. Technical Architecture

### 7.1 Backend — Spring Boot

```
backend/
├── pom.xml
├── src/main/java/com/onboardingdiary/
│   ├── OnboardingDiaryApplication.java
│   ├── config/
│   │   ├── SecurityConfig.java          # Spring Security + JWT filter
│   │   ├── CorsConfig.java              # CORS configuration
│   │   └── OpenApiConfig.java           # Swagger/OpenAPI config
│   ├── controller/
│   │   ├── AuthController.java
│   │   ├── UserController.java
│   │   ├── TaskController.java
│   │   ├── IssueController.java
│   │   ├── FeedbackController.java
│   │   ├── NoteController.java
│   │   ├── DashboardController.java
│   │   └── ReportController.java
│   ├── dto/
│   │   ├── request/                     # Request DTOs with validation
│   │   └── response/                    # Response DTOs
│   ├── entity/
│   │   ├── User.java
│   │   ├── Task.java
│   │   ├── Issue.java
│   │   ├── Feedback.java
│   │   ├── Note.java
│   │   └── Report.java
│   ├── enums/
│   │   ├── Role.java
│   │   ├── TaskStatus.java
│   │   ├── TaskPriority.java
│   │   ├── TaskCategory.java
│   │   ├── IssueSeverity.java
│   │   ├── IssueStatus.java
│   │   ├── FeedbackType.java
│   │   ├── ReportType.java
│   │   └── ReportFormat.java
│   ├── repository/
│   │   ├── UserRepository.java
│   │   ├── TaskRepository.java
│   │   ├── IssueRepository.java
│   │   ├── FeedbackRepository.java
│   │   ├── NoteRepository.java
│   │   └── ReportRepository.java
│   ├── security/
│   │   ├── JwtTokenProvider.java
│   │   ├── JwtAuthenticationFilter.java
│   │   └── UserPrincipal.java
│   ├── service/
│   │   ├── AuthService.java
│   │   ├── UserService.java
│   │   ├── TaskService.java
│   │   ├── IssueService.java
│   │   ├── FeedbackService.java
│   │   ├── NoteService.java
│   │   ├── DashboardService.java
│   │   └── ReportService.java
│   └── exception/
│       ├── GlobalExceptionHandler.java
│       ├── ResourceNotFoundException.java
│       └── UnauthorizedException.java
├── src/main/resources/
│   ├── application.yml
│   └── db/migration/                    # Flyway migrations
│       └── V1__initial_schema.sql
└── src/test/java/
```

### 7.2 Key Dependencies

| Dependency | Purpose |
|-----------|---------|
| spring-boot-starter-web | REST API |
| spring-boot-starter-data-jpa | JPA/Hibernate ORM |
| spring-boot-starter-security | Security framework |
| spring-boot-starter-validation | Bean validation (Jakarta) |
| jjwt (io.jsonwebtoken) | JWT token generation/validation |
| postgresql | PostgreSQL JDBC driver |
| flyway-core | Database migrations |
| springdoc-openapi | Swagger UI / OpenAPI docs |
| opencsv | CSV export |
| openpdf / itext | PDF generation |
| lombok | Boilerplate reduction |

### 7.3 Frontend — React + TypeScript + Vite

```
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/
│   │   ├── client.ts                    # Axios instance with interceptors
│   │   ├── auth.ts
│   │   ├── tasks.ts
│   │   ├── issues.ts
│   │   ├── feedback.ts
│   │   ├── notes.ts
│   │   ├── dashboard.ts
│   │   └── reports.ts
│   ├── components/
│   │   ├── Layout.tsx                   # AppLayout with sidebar + header
│   │   ├── ProtectedRoute.tsx
│   │   └── ...shared components
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── tasks/
│   │   ├── issues/
│   │   ├── feedback/
│   │   ├── notes/
│   │   ├── reports/
│   │   ├── admin/
│   │   └── Profile.tsx
│   ├── context/
│   │   └── AuthContext.tsx
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── validators.ts
└── public/
```

### 7.4 UI Library

- **Ant Design (antd)** — comprehensive React component library
- **Recharts** — charting for dashboard visualizations

### 7.5 Docker Compose

```yaml
services:
  db:        # PostgreSQL 16
  backend:   # Spring Boot (Java 17)
  frontend:  # React (Nginx for prod, Vite dev server for dev)
```

---

## 8. Suggested Extension Features

### 8.1 Onboarding Checklist

Predefined checklist of onboarding tasks that managers create and assign to recruits. Each item has a title, description, due date, and completion status. Recruits check off items; managers see real-time progress.

### 8.2 Global Search

Search bar that searches across all entry types (tasks, issues, feedback, notes) simultaneously. Results grouped by category with highlighted match text. Uses PostgreSQL full-text search.

### 8.3 Dashboard Charts & Analytics

Visual charts: tasks over time (line chart), issue severity distribution (pie chart), feedback sentiment breakdown (bar chart), onboarding progress timeline.

### 8.4 In-App Notifications

Notification system: recruits notified when managers view entries or checklists assigned; managers notified on new high-severity issues or checklist completions. Activity feed on dashboard.

---

## Build Order (Incremental)

The application will be built in this order, with each step as a separate commit:

1. **Project scaffolding** — Spring Boot + React + Docker Compose + PostgreSQL setup
2. **Database schema & JPA entities** — Flyway migration + entity classes
3. **Authentication** — JWT-based register/login + Spring Security + auth UI
4. **Task Log** — CRUD API + UI (list, create, edit, delete, filter)
5. **Issue Log** — CRUD API + UI
6. **Feedback Notes** — CRUD API + UI
7. **Additional Notes** — CRUD API + UI
8. **Dashboard** — Summary API + UI for recruits
9. **Reports** — PDF/CSV generation + download API + UI
10. **Manager views** — View recruit data + manager dashboard
11. **Admin user management** — User CRUD + role/manager assignment
12. **Extension features** — TBD after core is complete
