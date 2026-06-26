# Onboarding Diary Application - Detailed Requirements

## Table of Contents

1. [Overview](#1-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [User Stories](#3-user-stories)
4. [Data Models](#4-data-models)
5. [API Endpoints](#5-api-endpoints)
6. [UI Flows](#6-ui-flows)
7. [Validation Rules](#7-validation-rules)
8. [Reports & Exports](#8-reports--exports)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Suggested Additional Features](#10-suggested-additional-features)

---

## 1. Overview

A responsive web application that enables new recruits to document their onboarding journey by logging daily tasks, recording issues/blockers, submitting feedback, and capturing free-form notes. Managers can view recruit entries and generate downloadable reports. Admins manage users and have full visibility across the system.

---

## 2. User Roles & Permissions

### 2.1 New Recruit

- Can create, read, update, and delete their own entries (tasks, issues, feedback, notes).
- Can view their own dashboard and generate reports on their own data.
- Cannot view other recruits' data.

### 2.2 Manager

- All Recruit permissions for their own entries.
- Can view entries of recruits assigned to them.
- Can generate and download reports for recruits they oversee.
- Cannot edit or delete recruit entries.

### 2.3 Admin

- All Manager permissions.
- Can create, edit, activate, and deactivate user accounts.
- Can assign/reassign recruits to managers.
- Can view all data across all users.
- Can manage departments and categories.

---

## 3. User Stories

### 3.1 Authentication & Profile

| ID     | Story | Acceptance Criteria |
|--------|-------|---------------------|
| US-001 | As a new user, I want to sign up with my email and password so that I can access the application. | - Registration form collects name, email, password, department, and start date. <br> - Email must be unique. <br> - Password must meet strength requirements. <br> - User receives a confirmation message upon successful registration. |
| US-002 | As a registered user, I want to log in with my email and password so that I can access my diary. | - Login form accepts email and password. <br> - Invalid credentials show a clear error message. <br> - Successful login redirects to the dashboard. <br> - A JWT or session token is issued. |
| US-003 | As a logged-in user, I want to view and edit my profile so that I can keep my information current. | - Profile page shows name, email, role, department, and start date. <br> - User can edit name and department. <br> - Email changes require re-verification. |
| US-004 | As a user, I want to log out so that my session is securely terminated. | - Clicking "Log out" clears the session/token and redirects to the login page. |
| US-005 | As a user, I want to reset my password if I forget it so that I can regain access to my account. | - "Forgot password" link on the login page. <br> - User enters email and receives a reset link (valid for 1 hour). <br> - New password must meet strength requirements. |

### 3.2 Task Log

| ID     | Story | Acceptance Criteria |
|--------|-------|---------------------|
| US-010 | As a recruit, I want to create a task entry so that I can record what I worked on. | - Form collects date, title, description, category, status, and priority. <br> - Entry is saved and appears in the task list. |
| US-011 | As a recruit, I want to edit an existing task entry so that I can correct or update it. | - All fields are editable. <br> - Changes are persisted and a success message is shown. |
| US-012 | As a recruit, I want to delete a task entry so that I can remove irrelevant records. | - A confirmation dialog appears before deletion. <br> - Entry is removed from the list after confirmation. |
| US-013 | As a recruit, I want to filter my tasks by date range, category, or status so that I can find specific entries. | - Filter controls for date range (from/to), category (dropdown), and status (dropdown). <br> - Task list updates in real time or on "Apply" click. <br> - A "Clear Filters" button resets all filters. |
| US-014 | As a recruit, I want to see my tasks sorted by date (newest first) by default. | - Default sort order is descending by date. <br> - User can toggle ascending/descending. |

### 3.3 Issue Log

| ID     | Story | Acceptance Criteria |
|--------|-------|---------------------|
| US-020 | As a recruit, I want to log an issue or blocker so that I can track problems encountered during onboarding. | - Form collects date, title, description, severity, status, and resolution notes. <br> - Entry is saved and appears in the issue list. |
| US-021 | As a recruit, I want to edit an issue entry so that I can update its status or add resolution notes. | - All fields are editable. <br> - Changes are persisted. |
| US-022 | As a recruit, I want to delete an issue entry. | - Confirmation dialog before deletion. <br> - Entry removed from the list. |
| US-023 | As a recruit, I want to filter issues by status or severity so that I can prioritize open blockers. | - Filter controls for status and severity dropdowns. <br> - List updates accordingly. |
| US-024 | As a recruit, I want to mark an issue as resolved and add resolution notes. | - Status can be changed to "Resolved". <br> - Resolution notes field becomes required when status is "Resolved". |

### 3.4 Feedback Notes

| ID     | Story | Acceptance Criteria |
|--------|-------|---------------------|
| US-030 | As a recruit, I want to submit feedback about my onboarding experience so that the process can be improved. | - Form collects date, subject, type (Positive / Suggestion / Concern), and details. <br> - Entry is saved and appears in the feedback list. |
| US-031 | As a recruit, I want to edit my feedback entries. | - All fields are editable. <br> - Changes are persisted. |
| US-032 | As a recruit, I want to delete a feedback entry. | - Confirmation dialog before deletion. <br> - Entry removed from the list. |
| US-033 | As a recruit, I want to filter feedback by type so that I can review specific kinds of feedback. | - Dropdown filter for type (Positive / Suggestion / Concern / All). |

### 3.5 Additional Notes

| ID     | Story | Acceptance Criteria |
|--------|-------|---------------------|
| US-040 | As a recruit, I want to create free-form notes so that I can capture miscellaneous thoughts and learnings. | - Form collects date, title, content (rich text or plain text), and tags. <br> - Entry is saved and appears in the notes list. |
| US-041 | As a recruit, I want to edit my notes. | - All fields are editable. |
| US-042 | As a recruit, I want to delete a note. | - Confirmation dialog before deletion. |
| US-043 | As a recruit, I want to filter notes by tags so that I can find related notes quickly. | - Tag-based filter (multi-select). <br> - Notes matching any selected tag are shown. |
| US-044 | As a recruit, I want to add multiple tags to a note so that I can categorize it flexibly. | - Tags are entered as comma-separated values or via a tag input component. <br> - Duplicate tags on the same note are not allowed. |

### 3.6 Dashboard

| ID     | Story | Acceptance Criteria |
|--------|-------|---------------------|
| US-050 | As a recruit, I want to see a dashboard summarizing my onboarding progress so that I can track my journey at a glance. | - Dashboard shows: total tasks, completed tasks, open issues, feedback count, notes count. <br> - Shows recent entries (last 5) across all categories. <br> - Task completion progress bar. |
| US-051 | As a manager, I want to see a dashboard of my assigned recruits so that I can monitor their progress. | - Dashboard lists all assigned recruits with summary metrics (tasks completed, open issues). <br> - Clicking a recruit drills down into their entries. |
| US-052 | As an admin, I want to see a system-wide dashboard so that I can monitor overall onboarding activity. | - Shows total users by role, total entries by category, and recent activity feed. |

### 3.7 Reports

| ID     | Story | Acceptance Criteria |
|--------|-------|---------------------|
| US-060 | As a recruit, I want to generate a report of my entries by date range so that I can review my progress. | - Report options: date range (from/to), category filter (tasks, issues, feedback, notes, or all). <br> - Report is rendered on-screen before download. |
| US-061 | As a recruit, I want to download my report as PDF or CSV. | - "Download PDF" and "Download CSV" buttons available after generating a report. <br> - PDF includes formatted tables and headers. <br> - CSV includes column headers and raw data. |
| US-062 | As a manager, I want to generate a report for a specific recruit I oversee. | - Manager selects a recruit from a dropdown of assigned recruits. <br> - Same date range and category filters as recruit reports. <br> - Download as PDF or CSV. |

### 3.8 User Management (Admin)

| ID     | Story | Acceptance Criteria |
|--------|-------|---------------------|
| US-070 | As an admin, I want to create user accounts so that new recruits and managers can use the system. | - Form collects name, email, role, department, and start date. <br> - A temporary password is generated and emailed to the user. |
| US-071 | As an admin, I want to edit user accounts so that I can correct information or change roles. | - All user fields are editable. <br> - Role changes take effect immediately. |
| US-072 | As an admin, I want to deactivate a user account so that former employees can no longer access the system. | - Deactivated users cannot log in. <br> - Their data is retained but read-only. |
| US-073 | As an admin, I want to assign recruits to managers so that managers can oversee their progress. | - Admin selects a recruit and assigns them to a manager from a dropdown. <br> - A recruit can be reassigned to a different manager. |
| US-074 | As an admin, I want to manage departments and task categories. | - CRUD operations on departments (name, description). <br> - CRUD operations on task categories (name, description). |

---

## 4. Data Models

### 4.1 User

| Field       | Type         | Constraints                                |
|-------------|--------------|--------------------------------------------|
| id          | UUID / Int   | Primary key, auto-generated                |
| name        | String       | Required, 2-100 characters                 |
| email       | String       | Required, unique, valid email format       |
| passwordHash| String       | Required, stored as bcrypt hash            |
| role        | Enum         | Required, one of: RECRUIT, MANAGER, ADMIN  |
| department  | String       | Required, 2-100 characters                 |
| startDate   | Date         | Required, cannot be in the future          |
| managerId   | UUID / Int   | Foreign key to User (nullable, for recruits)|
| isActive    | Boolean      | Default: true                              |
| createdAt   | DateTime     | Auto-set on creation                       |
| updatedAt   | DateTime     | Auto-set on update                         |

### 4.2 TaskEntry

| Field       | Type         | Constraints                                |
|-------------|--------------|--------------------------------------------|
| id          | UUID / Int   | Primary key, auto-generated                |
| userId      | UUID / Int   | Foreign key to User, required              |
| date        | Date         | Required, cannot be in the future          |
| title       | String       | Required, 3-200 characters                 |
| description | Text         | Optional, max 5000 characters              |
| category    | String       | Required, from predefined list or custom   |
| status      | Enum         | Required, one of: NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED |
| priority    | Enum         | Required, one of: LOW, MEDIUM, HIGH, CRITICAL |
| createdAt   | DateTime     | Auto-set on creation                       |
| updatedAt   | DateTime     | Auto-set on update                         |

### 4.3 IssueEntry

| Field           | Type         | Constraints                            |
|-----------------|--------------|----------------------------------------|
| id              | UUID / Int   | Primary key, auto-generated            |
| userId          | UUID / Int   | Foreign key to User, required          |
| date            | Date         | Required, cannot be in the future      |
| title           | String       | Required, 3-200 characters             |
| description     | Text         | Required, max 5000 characters          |
| severity        | Enum         | Required, one of: LOW, MEDIUM, HIGH, CRITICAL |
| status          | Enum         | Required, one of: OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| resolutionNotes | Text         | Required when status is RESOLVED or CLOSED, max 5000 characters |
| createdAt       | DateTime     | Auto-set on creation                   |
| updatedAt       | DateTime     | Auto-set on update                     |

### 4.4 FeedbackEntry

| Field       | Type         | Constraints                                |
|-------------|--------------|--------------------------------------------|
| id          | UUID / Int   | Primary key, auto-generated                |
| userId      | UUID / Int   | Foreign key to User, required              |
| date        | Date         | Required, cannot be in the future          |
| subject     | String       | Required, 3-200 characters                 |
| type        | Enum         | Required, one of: POSITIVE, SUGGESTION, CONCERN |
| details     | Text         | Required, max 5000 characters              |
| createdAt   | DateTime     | Auto-set on creation                       |
| updatedAt   | DateTime     | Auto-set on update                         |

### 4.5 NoteEntry

| Field       | Type         | Constraints                                |
|-------------|--------------|--------------------------------------------|
| id          | UUID / Int   | Primary key, auto-generated                |
| userId      | UUID / Int   | Foreign key to User, required              |
| date        | Date         | Required, cannot be in the future          |
| title       | String       | Required, 3-200 characters                 |
| content     | Text         | Required, max 10000 characters             |
| tags        | String[]     | Optional, each tag 1-50 chars, max 10 tags |
| createdAt   | DateTime     | Auto-set on creation                       |
| updatedAt   | DateTime     | Auto-set on update                         |

### 4.6 Department

| Field       | Type         | Constraints                                |
|-------------|--------------|--------------------------------------------|
| id          | UUID / Int   | Primary key, auto-generated                |
| name        | String       | Required, unique, 2-100 characters         |
| description | String       | Optional, max 500 characters               |
| createdAt   | DateTime     | Auto-set on creation                       |

### 4.7 Category

| Field       | Type         | Constraints                                |
|-------------|--------------|--------------------------------------------|
| id          | UUID / Int   | Primary key, auto-generated                |
| name        | String       | Required, unique, 2-100 characters         |
| description | String       | Optional, max 500 characters               |
| createdAt   | DateTime     | Auto-set on creation                       |

---

## 5. API Endpoints

All endpoints return JSON. Authenticated endpoints require a valid JWT in the `Authorization: Bearer <token>` header.

### 5.1 Authentication

| Method | Endpoint              | Description                  | Auth Required | Allowed Roles |
|--------|-----------------------|------------------------------|---------------|---------------|
| POST   | `/api/auth/register`  | Register a new user          | No            | -             |
| POST   | `/api/auth/login`     | Log in, returns JWT          | No            | -             |
| POST   | `/api/auth/logout`    | Invalidate the current token | Yes           | All           |
| POST   | `/api/auth/forgot-password` | Send password reset email | No          | -             |
| POST   | `/api/auth/reset-password`  | Reset password with token | No          | -             |

#### `POST /api/auth/register`

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@company.com",
  "password": "SecureP@ss123",
  "department": "Engineering",
  "startDate": "2026-06-15"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid-string",
  "name": "Jane Doe",
  "email": "jane.doe@company.com",
  "role": "RECRUIT",
  "department": "Engineering",
  "startDate": "2026-06-15",
  "createdAt": "2026-06-15T10:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Validation errors (missing fields, weak password, invalid email)
- `409 Conflict` - Email already registered

#### `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "jane.doe@company.com",
  "password": "SecureP@ss123"
}
```

**Response (200 OK):**
```json
{
  "token": "jwt-token-string",
  "expiresIn": 86400,
  "user": {
    "id": "uuid-string",
    "name": "Jane Doe",
    "email": "jane.doe@company.com",
    "role": "RECRUIT"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid email or password
- `403 Forbidden` - Account deactivated

#### `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "jane.doe@company.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If the email is registered, a reset link has been sent."
}
```

#### `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "token": "reset-token-string",
  "newPassword": "NewSecureP@ss456"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successfully."
}
```

**Error Responses:**
- `400 Bad Request` - Invalid or expired token, weak password

### 5.2 User Profile

| Method | Endpoint              | Description                  | Auth Required | Allowed Roles |
|--------|-----------------------|------------------------------|---------------|---------------|
| GET    | `/api/users/me`       | Get current user profile     | Yes           | All           |
| PUT    | `/api/users/me`       | Update current user profile  | Yes           | All           |
| PUT    | `/api/users/me/password` | Change password           | Yes           | All           |

#### `GET /api/users/me`

**Response (200 OK):**
```json
{
  "id": "uuid-string",
  "name": "Jane Doe",
  "email": "jane.doe@company.com",
  "role": "RECRUIT",
  "department": "Engineering",
  "startDate": "2026-06-15",
  "managerId": "manager-uuid",
  "managerName": "John Smith",
  "createdAt": "2026-06-15T10:00:00Z"
}
```

#### `PUT /api/users/me`

**Request Body:**
```json
{
  "name": "Jane M. Doe",
  "department": "Product Engineering"
}
```

**Response (200 OK):** Updated user object.

#### `PUT /api/users/me/password`

**Request Body:**
```json
{
  "currentPassword": "OldP@ss123",
  "newPassword": "NewP@ss456"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully."
}
```

### 5.3 Task Entries

| Method | Endpoint                | Description              | Auth Required | Allowed Roles          |
|--------|-------------------------|--------------------------|---------------|------------------------|
| GET    | `/api/tasks`            | List tasks (with filters)| Yes           | RECRUIT (own), MANAGER (assigned recruits), ADMIN (all) |
| GET    | `/api/tasks/:id`        | Get a single task        | Yes           | Owner, assigned Manager, Admin |
| POST   | `/api/tasks`            | Create a task entry      | Yes           | RECRUIT                |
| PUT    | `/api/tasks/:id`        | Update a task entry      | Yes           | Owner only             |
| DELETE | `/api/tasks/:id`        | Delete a task entry      | Yes           | Owner only             |

#### `GET /api/tasks`

**Query Parameters:**
| Parameter  | Type   | Description                                  |
|------------|--------|----------------------------------------------|
| dateFrom   | Date   | Filter entries on or after this date         |
| dateTo     | Date   | Filter entries on or before this date        |
| category   | String | Filter by category name                      |
| status     | String | Filter by status (NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED) |
| priority   | String | Filter by priority (LOW, MEDIUM, HIGH, CRITICAL) |
| userId     | UUID   | Filter by user (Manager/Admin only)          |
| page       | Int    | Page number (default: 1)                     |
| pageSize   | Int    | Items per page (default: 20, max: 100)       |
| sortBy     | String | Sort field (default: date)                   |
| sortOrder  | String | asc or desc (default: desc)                  |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid-string",
      "userId": "uuid-string",
      "date": "2026-06-20",
      "title": "Set up development environment",
      "description": "Installed IDE, configured Git, set up local database.",
      "category": "Setup",
      "status": "COMPLETED",
      "priority": "HIGH",
      "createdAt": "2026-06-20T09:00:00Z",
      "updatedAt": "2026-06-20T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 45,
    "totalPages": 3
  }
}
```

#### `POST /api/tasks`

**Request Body:**
```json
{
  "date": "2026-06-20",
  "title": "Set up development environment",
  "description": "Install IDE, configure Git, set up local database.",
  "category": "Setup",
  "status": "IN_PROGRESS",
  "priority": "HIGH"
}
```

**Response (201 Created):** Created task object.

**Error Responses:**
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized for this action

#### `PUT /api/tasks/:id`

**Request Body:** Same shape as POST (all fields optional; only provided fields are updated).

**Response (200 OK):** Updated task object.

**Error Responses:**
- `400 Bad Request` - Validation errors
- `403 Forbidden` - Not the task owner
- `404 Not Found` - Task not found

#### `DELETE /api/tasks/:id`

**Response (204 No Content)**

**Error Responses:**
- `403 Forbidden` - Not the task owner
- `404 Not Found` - Task not found

### 5.4 Issue Entries

| Method | Endpoint                | Description               | Auth Required | Allowed Roles          |
|--------|-------------------------|---------------------------|---------------|------------------------|
| GET    | `/api/issues`           | List issues (with filters)| Yes           | RECRUIT (own), MANAGER (assigned recruits), ADMIN (all) |
| GET    | `/api/issues/:id`       | Get a single issue        | Yes           | Owner, assigned Manager, Admin |
| POST   | `/api/issues`           | Create an issue entry     | Yes           | RECRUIT                |
| PUT    | `/api/issues/:id`       | Update an issue entry     | Yes           | Owner only             |
| DELETE | `/api/issues/:id`       | Delete an issue entry     | Yes           | Owner only             |

#### `GET /api/issues`

**Query Parameters:**
| Parameter  | Type   | Description                                   |
|------------|--------|-----------------------------------------------|
| dateFrom   | Date   | Filter entries on or after this date          |
| dateTo     | Date   | Filter entries on or before this date         |
| status     | String | Filter by status (OPEN, IN_PROGRESS, RESOLVED, CLOSED) |
| severity   | String | Filter by severity (LOW, MEDIUM, HIGH, CRITICAL) |
| userId     | UUID   | Filter by user (Manager/Admin only)           |
| page       | Int    | Page number (default: 1)                      |
| pageSize   | Int    | Items per page (default: 20, max: 100)        |
| sortBy     | String | Sort field (default: date)                    |
| sortOrder  | String | asc or desc (default: desc)                   |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid-string",
      "userId": "uuid-string",
      "date": "2026-06-21",
      "title": "VPN access not working",
      "description": "Cannot connect to internal network via VPN client.",
      "severity": "HIGH",
      "status": "OPEN",
      "resolutionNotes": null,
      "createdAt": "2026-06-21T10:00:00Z",
      "updatedAt": "2026-06-21T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 12,
    "totalPages": 1
  }
}
```

#### `POST /api/issues`

**Request Body:**
```json
{
  "date": "2026-06-21",
  "title": "VPN access not working",
  "description": "Cannot connect to internal network via VPN client.",
  "severity": "HIGH",
  "status": "OPEN",
  "resolutionNotes": ""
}
```

**Response (201 Created):** Created issue object.

#### `PUT /api/issues/:id`

**Request Body:** Same shape as POST (all fields optional).

**Response (200 OK):** Updated issue object.

#### `DELETE /api/issues/:id`

**Response (204 No Content)**

### 5.5 Feedback Entries

| Method | Endpoint                  | Description                 | Auth Required | Allowed Roles          |
|--------|---------------------------|-----------------------------|---------------|------------------------|
| GET    | `/api/feedback`           | List feedback (with filters)| Yes           | RECRUIT (own), MANAGER (assigned recruits), ADMIN (all) |
| GET    | `/api/feedback/:id`       | Get a single feedback entry | Yes           | Owner, assigned Manager, Admin |
| POST   | `/api/feedback`           | Create a feedback entry     | Yes           | RECRUIT                |
| PUT    | `/api/feedback/:id`       | Update a feedback entry     | Yes           | Owner only             |
| DELETE | `/api/feedback/:id`       | Delete a feedback entry     | Yes           | Owner only             |

#### `GET /api/feedback`

**Query Parameters:**
| Parameter  | Type   | Description                                  |
|------------|--------|----------------------------------------------|
| dateFrom   | Date   | Filter entries on or after this date         |
| dateTo     | Date   | Filter entries on or before this date        |
| type       | String | Filter by type (POSITIVE, SUGGESTION, CONCERN) |
| userId     | UUID   | Filter by user (Manager/Admin only)          |
| page       | Int    | Page number (default: 1)                     |
| pageSize   | Int    | Items per page (default: 20, max: 100)       |
| sortBy     | String | Sort field (default: date)                   |
| sortOrder  | String | asc or desc (default: desc)                  |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid-string",
      "userId": "uuid-string",
      "date": "2026-06-22",
      "subject": "Great onboarding buddy program",
      "type": "POSITIVE",
      "details": "My onboarding buddy was very helpful in getting me up to speed with the codebase.",
      "createdAt": "2026-06-22T14:00:00Z",
      "updatedAt": "2026-06-22T14:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 8,
    "totalPages": 1
  }
}
```

#### `POST /api/feedback`

**Request Body:**
```json
{
  "date": "2026-06-22",
  "subject": "Great onboarding buddy program",
  "type": "POSITIVE",
  "details": "My onboarding buddy was very helpful in getting me up to speed with the codebase."
}
```

**Response (201 Created):** Created feedback object.

### 5.6 Note Entries

| Method | Endpoint                | Description              | Auth Required | Allowed Roles          |
|--------|-------------------------|--------------------------|---------------|------------------------|
| GET    | `/api/notes`            | List notes (with filters)| Yes           | RECRUIT (own), MANAGER (assigned recruits), ADMIN (all) |
| GET    | `/api/notes/:id`        | Get a single note        | Yes           | Owner, assigned Manager, Admin |
| POST   | `/api/notes`            | Create a note entry      | Yes           | RECRUIT                |
| PUT    | `/api/notes/:id`        | Update a note entry      | Yes           | Owner only             |
| DELETE | `/api/notes/:id`        | Delete a note entry      | Yes           | Owner only             |

#### `GET /api/notes`

**Query Parameters:**
| Parameter  | Type   | Description                                  |
|------------|--------|----------------------------------------------|
| dateFrom   | Date   | Filter entries on or after this date         |
| dateTo     | Date   | Filter entries on or before this date        |
| tags       | String | Comma-separated list of tags to filter by    |
| userId     | UUID   | Filter by user (Manager/Admin only)          |
| page       | Int    | Page number (default: 1)                     |
| pageSize   | Int    | Items per page (default: 20, max: 100)       |
| sortBy     | String | Sort field (default: date)                   |
| sortOrder  | String | asc or desc (default: desc)                  |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid-string",
      "userId": "uuid-string",
      "date": "2026-06-23",
      "title": "Git branching strategy notes",
      "content": "The team uses trunk-based development with short-lived feature branches...",
      "tags": ["git", "workflow", "engineering"],
      "createdAt": "2026-06-23T11:00:00Z",
      "updatedAt": "2026-06-23T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 15,
    "totalPages": 1
  }
}
```

#### `POST /api/notes`

**Request Body:**
```json
{
  "date": "2026-06-23",
  "title": "Git branching strategy notes",
  "content": "The team uses trunk-based development with short-lived feature branches...",
  "tags": ["git", "workflow", "engineering"]
}
```

**Response (201 Created):** Created note object.

### 5.7 Dashboard

| Method | Endpoint                       | Description                        | Auth Required | Allowed Roles |
|--------|--------------------------------|------------------------------------|---------------|---------------|
| GET    | `/api/dashboard`               | Get dashboard data for current user| Yes           | All           |
| GET    | `/api/dashboard/recruits`      | Get recruit overview (manager)     | Yes           | MANAGER, ADMIN|
| GET    | `/api/dashboard/system`        | Get system-wide overview           | Yes           | ADMIN         |

#### `GET /api/dashboard`

**Response (200 OK):**
```json
{
  "summary": {
    "totalTasks": 45,
    "completedTasks": 30,
    "taskCompletionPercentage": 66.7,
    "openIssues": 3,
    "totalIssues": 12,
    "totalFeedback": 8,
    "totalNotes": 15
  },
  "recentEntries": [
    {
      "type": "task",
      "id": "uuid-string",
      "title": "Set up development environment",
      "date": "2026-06-20",
      "status": "COMPLETED"
    },
    {
      "type": "issue",
      "id": "uuid-string",
      "title": "VPN access not working",
      "date": "2026-06-21",
      "status": "OPEN"
    }
  ],
  "onboardingDaysElapsed": 10,
  "startDate": "2026-06-15"
}
```

#### `GET /api/dashboard/recruits`

**Response (200 OK):**
```json
{
  "recruits": [
    {
      "id": "uuid-string",
      "name": "Jane Doe",
      "department": "Engineering",
      "startDate": "2026-06-15",
      "daysElapsed": 10,
      "tasksCompleted": 30,
      "totalTasks": 45,
      "openIssues": 3,
      "feedbackCount": 8
    }
  ]
}
```

#### `GET /api/dashboard/system`

**Response (200 OK):**
```json
{
  "userCounts": {
    "recruits": 25,
    "managers": 8,
    "admins": 2
  },
  "entryCounts": {
    "tasks": 500,
    "issues": 120,
    "feedback": 75,
    "notes": 200
  },
  "recentActivity": [
    {
      "userId": "uuid-string",
      "userName": "Jane Doe",
      "action": "created_task",
      "title": "Set up development environment",
      "timestamp": "2026-06-20T09:00:00Z"
    }
  ]
}
```

### 5.8 Reports

| Method | Endpoint                | Description                    | Auth Required | Allowed Roles          |
|--------|-------------------------|--------------------------------|---------------|------------------------|
| GET    | `/api/reports`          | Generate a report (preview)    | Yes           | All (scoped by role)   |
| GET    | `/api/reports/download` | Download report as PDF or CSV  | Yes           | All (scoped by role)   |

#### `GET /api/reports`

**Query Parameters:**
| Parameter  | Type   | Description                                       |
|------------|--------|---------------------------------------------------|
| dateFrom   | Date   | Start date (required)                             |
| dateTo     | Date   | End date (required)                               |
| category   | String | tasks, issues, feedback, notes, or all (default)  |
| userId     | UUID   | Specific user (Manager/Admin only)                |
| format     | String | json (default for preview)                        |

**Response (200 OK):**
```json
{
  "reportPeriod": {
    "from": "2026-06-01",
    "to": "2026-06-30"
  },
  "generatedAt": "2026-06-26T04:00:00Z",
  "generatedBy": "Jane Doe",
  "sections": {
    "tasks": {
      "total": 45,
      "completed": 30,
      "entries": [...]
    },
    "issues": {
      "total": 12,
      "resolved": 9,
      "entries": [...]
    },
    "feedback": {
      "total": 8,
      "byType": { "POSITIVE": 5, "SUGGESTION": 2, "CONCERN": 1 },
      "entries": [...]
    },
    "notes": {
      "total": 15,
      "entries": [...]
    }
  }
}
```

#### `GET /api/reports/download`

**Query Parameters:** Same as `/api/reports` plus:
| Parameter | Type   | Description              |
|-----------|--------|--------------------------|
| format    | String | `pdf` or `csv` (required)|

**Response:**
- `200 OK` with `Content-Type: application/pdf` or `text/csv`
- `Content-Disposition: attachment; filename="onboarding-report-2026-06-01-to-2026-06-30.pdf"`

### 5.9 User Management (Admin)

| Method | Endpoint                      | Description                    | Auth Required | Allowed Roles |
|--------|-------------------------------|--------------------------------|---------------|---------------|
| GET    | `/api/admin/users`            | List all users (with filters)  | Yes           | ADMIN         |
| GET    | `/api/admin/users/:id`        | Get a specific user            | Yes           | ADMIN         |
| POST   | `/api/admin/users`            | Create a new user              | Yes           | ADMIN         |
| PUT    | `/api/admin/users/:id`        | Update a user                  | Yes           | ADMIN         |
| PATCH  | `/api/admin/users/:id/status` | Activate/deactivate a user     | Yes           | ADMIN         |
| PUT    | `/api/admin/users/:id/assign` | Assign recruit to manager      | Yes           | ADMIN         |

#### `GET /api/admin/users`

**Query Parameters:**
| Parameter  | Type   | Description                         |
|------------|--------|-------------------------------------|
| role       | String | Filter by role                      |
| department | String | Filter by department                |
| isActive   | Bool   | Filter by active status             |
| search     | String | Search by name or email             |
| page       | Int    | Page number                         |
| pageSize   | Int    | Items per page                      |

#### `PUT /api/admin/users/:id/assign`

**Request Body:**
```json
{
  "managerId": "manager-uuid"
}
```

**Response (200 OK):** Updated user object with assigned manager.

### 5.10 Departments & Categories (Admin)

| Method | Endpoint                       | Description              | Auth Required | Allowed Roles |
|--------|--------------------------------|--------------------------|---------------|---------------|
| GET    | `/api/admin/departments`       | List departments         | Yes           | ADMIN         |
| POST   | `/api/admin/departments`       | Create a department      | Yes           | ADMIN         |
| PUT    | `/api/admin/departments/:id`   | Update a department      | Yes           | ADMIN         |
| DELETE | `/api/admin/departments/:id`   | Delete a department      | Yes           | ADMIN         |
| GET    | `/api/admin/categories`        | List task categories     | Yes           | ADMIN         |
| POST   | `/api/admin/categories`        | Create a category        | Yes           | ADMIN         |
| PUT    | `/api/admin/categories/:id`    | Update a category        | Yes           | ADMIN         |
| DELETE | `/api/admin/categories/:id`    | Delete a category        | Yes           | ADMIN         |

---

## 6. UI Flows

### 6.1 Registration Flow

```
[Landing Page]
    |
    v
[Registration Form]
    - Name (text input)
    - Email (text input)
    - Password (password input, with strength indicator)
    - Confirm Password (password input)
    - Department (dropdown, populated from /api/admin/departments)
    - Start Date (date picker)
    - [Register] button
    |
    +-- Validation errors? --> Show inline error messages
    |
    +-- Success --> [Login Page] with "Registration successful. Please log in." banner
```

### 6.2 Login Flow

```
[Login Page]
    - Email (text input)
    - Password (password input)
    - [Log In] button
    - "Forgot Password?" link
    |
    +-- Invalid credentials? --> Show "Invalid email or password." error
    +-- Account deactivated? --> Show "Your account has been deactivated." error
    |
    +-- Success --> [Dashboard] (role-appropriate view)
```

### 6.3 Password Reset Flow

```
[Login Page] --> "Forgot Password?" link
    |
    v
[Forgot Password Page]
    - Email (text input)
    - [Send Reset Link] button
    |
    +-- Always shows: "If the email is registered, a reset link has been sent."
    |
    v
[Email with Reset Link] --> User clicks link
    |
    v
[Reset Password Page]
    - New Password (password input, with strength indicator)
    - Confirm New Password (password input)
    - [Reset Password] button
    |
    +-- Success --> [Login Page] with "Password reset successfully." banner
    +-- Expired token --> "This reset link has expired. Please request a new one."
```

### 6.4 Dashboard Flow (Recruit)

```
[Dashboard]
    +----------------------------------------------+
    | Welcome, Jane!  (Day 10 of Onboarding)       |
    +----------------------------------------------+
    | [Tasks: 30/45] [Issues: 3 open] [Feedback: 8]|
    | [Notes: 15]                                   |
    +----------------------------------------------+
    | Task Completion Progress  [======66%=====   ] |
    +----------------------------------------------+
    | Recent Entries                                 |
    | +-----------+--------+--------+----------+    |
    | | Type      | Title  | Date   | Status   |    |
    | +-----------+--------+--------+----------+    |
    | | Task      | Setup  | Jun 20 | Done     |    |
    | | Issue     | VPN    | Jun 21 | Open     |    |
    | | Feedback  | Buddy  | Jun 22 | -        |    |
    | | Note      | Git    | Jun 23 | -        |    |
    | +-----------+--------+--------+----------+    |
    +----------------------------------------------+
    | Sidebar: Dashboard | Tasks | Issues |         |
    |            Feedback | Notes | Reports          |
    +----------------------------------------------+
```

### 6.5 Task Log Flow

```
[Task List Page]
    +---------------------------------------------------+
    | Filters: [Date From] [Date To] [Category v]       |
    |          [Status v]  [Priority v] [Apply] [Clear]  |
    +---------------------------------------------------+
    | [+ New Task] button                                |
    +---------------------------------------------------+
    | Task List (table/card view toggle)                 |
    | +------+----------+----------+--------+----------+ |
    | | Date | Title    | Category | Status | Actions  | |
    | +------+----------+----------+--------+----------+ |
    | | 6/20 | Setup    | Setup    | Done   | [E] [D]  | |
    | | 6/19 | Training | Learning | WIP    | [E] [D]  | |
    | +------+----------+----------+--------+----------+ |
    | Pagination: [< 1 2 3 >]                           |
    +---------------------------------------------------+

[+ New Task] or [E] (Edit) -->
    [Task Form Modal/Page]
        - Date (date picker, default: today)
        - Title (text input)
        - Description (textarea)
        - Category (dropdown)
        - Status (dropdown: Not Started / In Progress / Completed / Blocked)
        - Priority (dropdown: Low / Medium / High / Critical)
        - [Save] [Cancel]
        |
        +-- Validation errors? --> Inline errors below fields
        +-- Success --> Close modal, refresh list, show success toast

[D] (Delete) -->
    [Confirmation Dialog]
        "Are you sure you want to delete this task?"
        [Delete] [Cancel]
        |
        +-- Confirmed --> Remove from list, show success toast
```

### 6.6 Issue Log Flow

```
[Issue List Page]
    +---------------------------------------------------+
    | Filters: [Status v] [Severity v] [Apply] [Clear]  |
    +---------------------------------------------------+
    | [+ New Issue] button                               |
    +---------------------------------------------------+
    | Issue List                                         |
    | +------+----------+----------+--------+----------+ |
    | | Date | Title    | Severity | Status | Actions  | |
    | +------+----------+----------+--------+----------+ |
    | | 6/21 | VPN      | High     | Open   | [E] [D]  | |
    | +------+----------+----------+--------+----------+ |
    | Pagination: [< 1 >]                               |
    +---------------------------------------------------+

[+ New Issue] or [E] (Edit) -->
    [Issue Form Modal/Page]
        - Date (date picker, default: today)
        - Title (text input)
        - Description (textarea, required)
        - Severity (dropdown: Low / Medium / High / Critical)
        - Status (dropdown: Open / In Progress / Resolved / Closed)
        - Resolution Notes (textarea, required if status = Resolved/Closed)
        - [Save] [Cancel]
```

### 6.7 Feedback Flow

```
[Feedback List Page]
    +---------------------------------------------------+
    | Filters: [Type v: All/Positive/Suggestion/Concern] |
    +---------------------------------------------------+
    | [+ New Feedback] button                            |
    +---------------------------------------------------+
    | Feedback List                                      |
    | +------+----------+----------+---------+----------+|
    | | Date | Subject  | Type     | Preview | Actions  ||
    | +------+----------+----------+---------+----------+|
    | | 6/22 | Buddy    | Positive | My...   | [E] [D]  ||
    | +------+----------+----------+---------+----------+|
    +---------------------------------------------------+

[+ New Feedback] or [E] (Edit) -->
    [Feedback Form Modal/Page]
        - Date (date picker, default: today)
        - Subject (text input)
        - Type (radio buttons: Positive / Suggestion / Concern)
        - Details (textarea, required)
        - [Save] [Cancel]
```

### 6.8 Notes Flow

```
[Notes List Page]
    +---------------------------------------------------+
    | Filters: [Tags: multi-select dropdown]             |
    +---------------------------------------------------+
    | [+ New Note] button                                |
    +---------------------------------------------------+
    | Notes List (card view)                             |
    | +----------------------------+                     |
    | | Jun 23 - Git branching     |                     |
    | | Tags: [git] [workflow]     |                     |
    | | The team uses trunk-based..|                     |
    | | [Edit] [Delete]            |                     |
    | +----------------------------+                     |
    +---------------------------------------------------+

[+ New Note] or [Edit] -->
    [Note Form Modal/Page]
        - Date (date picker, default: today)
        - Title (text input)
        - Content (textarea or rich text editor)
        - Tags (tag input: type and press Enter to add, click X to remove)
        - [Save] [Cancel]
```

### 6.9 Reports Flow

```
[Reports Page]
    +---------------------------------------------------+
    | Generate Report                                    |
    | Date Range: [From] [To]                            |
    | Category: [dropdown: All / Tasks / Issues /        |
    |            Feedback / Notes]                        |
    | (Manager/Admin) Recruit: [dropdown of recruits]    |
    | [Generate Preview] button                          |
    +---------------------------------------------------+
    | Report Preview (rendered on screen)                |
    | +-----------------------------------------------+  |
    | | Onboarding Report: Jun 1 - Jun 30, 2026       |  |
    | | Generated for: Jane Doe                        |  |
    | |                                                |  |
    | | Tasks Summary: 45 total, 30 completed          |  |
    | | ... (tabular data) ...                         |  |
    | |                                                |  |
    | | Issues Summary: 12 total, 9 resolved           |  |
    | | ... (tabular data) ...                         |  |
    | +-----------------------------------------------+  |
    |                                                    |
    | [Download PDF] [Download CSV]                      |
    +---------------------------------------------------+
```

### 6.10 Admin - User Management Flow

```
[User Management Page] (Admin only)
    +---------------------------------------------------+
    | Filters: [Role v] [Department v] [Active v]       |
    |          [Search: name or email]                    |
    +---------------------------------------------------+
    | [+ Create User] button                             |
    +---------------------------------------------------+
    | Users List                                         |
    | +------+----------+--------+----------+----------+ |
    | | Name | Email    | Role   | Dept     | Actions  | |
    | +------+----------+--------+----------+----------+ |
    | | Jane | jane@... | Recruit| Eng      | [E][A][D]| |
    | +------+----------+--------+----------+----------+ |
    | [E] = Edit, [A] = Assign Manager, [D] = Deactivate|
    +---------------------------------------------------+

[+ Create User] or [E] -->
    [User Form Modal/Page]
        - Name (text input)
        - Email (text input)
        - Role (dropdown: Recruit / Manager / Admin)
        - Department (dropdown)
        - Start Date (date picker)
        - [Save] [Cancel]

[A] (Assign Manager) -->
    [Assign Manager Modal]
        - Current Manager: (displayed)
        - New Manager: [dropdown of managers]
        - [Assign] [Cancel]

[D] (Deactivate) -->
    [Confirmation Dialog]
        "Deactivate this user? They will no longer be able to log in."
        [Deactivate] [Cancel]
```

### 6.11 Manager Dashboard Flow

```
[Manager Dashboard]
    +----------------------------------------------+
    | My Recruits                                   |
    +------+----------+--------+---------+----------+
    | Name | Dept     | Day #  | Tasks   | Issues   |
    +------+----------+--------+---------+----------+
    | Jane | Eng      | 10     | 30/45   | 3 open   |
    | Bob  | Design   | 5      | 12/20   | 1 open   |
    +------+----------+--------+---------+----------+
    |                                               |
    | Click a recruit row to drill down into their  |
    | diary entries.                                 |
    +----------------------------------------------+

Click recruit row -->
    [Recruit Detail View]
        - Read-only view of recruit's tasks, issues, feedback, notes
        - Tabs for each category
        - [Generate Report] button
```

---

## 7. Validation Rules

### 7.1 Authentication & User Fields

| Field          | Rules                                                                                           |
|----------------|-------------------------------------------------------------------------------------------------|
| name           | Required. 2-100 characters. Letters, spaces, hyphens, and apostrophes only.                    |
| email          | Required. Valid email format (RFC 5322). Unique in the system. Max 254 characters.              |
| password       | Required. Min 8 characters. Must contain: 1 uppercase, 1 lowercase, 1 digit, 1 special character (!@#$%^&*). Max 128 characters. |
| confirmPassword| Must exactly match password.                                                                    |
| department     | Required. Must be a valid department from the system (if managed via admin) or 2-100 characters.|
| startDate      | Required. Valid date format (YYYY-MM-DD). Cannot be more than 30 days in the future. Cannot be more than 1 year in the past. |
| role           | Required. Must be one of: RECRUIT, MANAGER, ADMIN.                                             |

### 7.2 Task Entry Fields

| Field       | Rules                                                                                     |
|-------------|-------------------------------------------------------------------------------------------|
| date        | Required. Valid date (YYYY-MM-DD). Cannot be in the future. Cannot be before user's start date. |
| title       | Required. 3-200 characters. No leading/trailing whitespace (trimmed).                     |
| description | Optional. Max 5000 characters.                                                            |
| category    | Required. Must be a valid category from the system or 2-50 characters if free-text.       |
| status      | Required. Must be one of: NOT_STARTED, IN_PROGRESS, COMPLETED, BLOCKED.                  |
| priority    | Required. Must be one of: LOW, MEDIUM, HIGH, CRITICAL.                                   |

### 7.3 Issue Entry Fields

| Field           | Rules                                                                                 |
|-----------------|---------------------------------------------------------------------------------------|
| date            | Required. Valid date (YYYY-MM-DD). Cannot be in the future.                           |
| title           | Required. 3-200 characters. Trimmed.                                                 |
| description     | Required. 10-5000 characters. Must meaningfully describe the issue.                  |
| severity        | Required. Must be one of: LOW, MEDIUM, HIGH, CRITICAL.                               |
| status          | Required. Must be one of: OPEN, IN_PROGRESS, RESOLVED, CLOSED.                       |
| resolutionNotes | Required when status is RESOLVED or CLOSED. 10-5000 characters when required. Optional otherwise. |

### 7.4 Feedback Entry Fields

| Field   | Rules                                                                          |
|---------|--------------------------------------------------------------------------------|
| date    | Required. Valid date (YYYY-MM-DD). Cannot be in the future.                    |
| subject | Required. 3-200 characters. Trimmed.                                          |
| type    | Required. Must be one of: POSITIVE, SUGGESTION, CONCERN.                       |
| details | Required. 10-5000 characters.                                                  |

### 7.5 Note Entry Fields

| Field   | Rules                                                                          |
|---------|--------------------------------------------------------------------------------|
| date    | Required. Valid date (YYYY-MM-DD). Cannot be in the future.                    |
| title   | Required. 3-200 characters. Trimmed.                                          |
| content | Required. 1-10000 characters.                                                  |
| tags    | Optional. Array of strings. Each tag: 1-50 characters, alphanumeric and hyphens only, lowercased. Max 10 tags per note. No duplicate tags on same note. |

### 7.6 Report Parameters

| Field    | Rules                                                                         |
|----------|-------------------------------------------------------------------------------|
| dateFrom | Required. Valid date. Must be before or equal to dateTo.                      |
| dateTo   | Required. Valid date. Must be after or equal to dateFrom. Cannot be in the future. |
| category | Must be one of: tasks, issues, feedback, notes, all.                          |
| format   | For download: must be one of: pdf, csv.                                       |
| userId   | If provided, must be a valid user ID. Manager: must be an assigned recruit. Admin: any user. |

### 7.7 General Validation Rules

- All string inputs are trimmed of leading/trailing whitespace before validation.
- All date inputs use ISO 8601 format (YYYY-MM-DD).
- All datetime outputs use ISO 8601 format with UTC timezone (YYYY-MM-DDTHH:mm:ssZ).
- Pagination: `page` must be >= 1; `pageSize` must be 1-100 (default 20).
- Sort fields must match valid column names for the entity.
- API returns `422 Unprocessable Entity` for validation failures with a structured error response:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title must be between 3 and 200 characters."
    },
    {
      "field": "date",
      "message": "Date cannot be in the future."
    }
  ]
}
```

---

## 8. Reports & Exports

### 8.1 PDF Report Format

- **Header:** Application logo/name, report title, date range, generated for (user name), generated at (timestamp).
- **Sections:** One section per category (Tasks, Issues, Feedback, Notes) with summary stats and a formatted table of entries.
- **Footer:** Page numbers, "Generated by Onboarding Diary App".
- **Styling:** Clean, professional layout. Tables with alternating row colors.

### 8.2 CSV Report Format

- One CSV file per category, or a combined CSV with a "Category" column.
- First row: Column headers.
- All dates in ISO 8601.
- Text fields that contain commas or newlines are properly quoted.
- UTF-8 encoding with BOM for Excel compatibility.

---

## 9. Non-Functional Requirements

### 9.1 Performance

- API response times: < 200ms for list endpoints (with pagination), < 100ms for single-entity reads.
- Dashboard loads within 1 second.
- PDF generation completes within 5 seconds for up to 1000 entries.

### 9.2 Security

- Passwords stored using bcrypt with a cost factor of at least 12.
- JWT tokens expire after 24 hours; refresh tokens (optional) expire after 7 days.
- All API endpoints validate authorization (role-based access control).
- Rate limiting: 100 requests per minute per user for general endpoints; 5 requests per minute for auth endpoints (login, register, forgot-password).
- CORS configured to allow only the frontend origin.
- Input sanitization to prevent XSS and SQL injection.
- HTTPS enforced in production.

### 9.3 Accessibility

- WCAG 2.1 Level AA compliance.
- All form inputs have associated labels.
- Color contrast ratios meet minimum requirements.
- Keyboard navigation support for all interactive elements.
- Screen reader compatible (ARIA attributes).

### 9.4 Responsiveness

- Mobile-first responsive design.
- Breakpoints: mobile (< 768px), tablet (768px - 1024px), desktop (> 1024px).
- Tables switch to card layout on mobile.
- Navigation collapses to a hamburger menu on mobile.

### 9.5 Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

---

## 10. Suggested Additional Features

### 10.1 Onboarding Checklist

- Admin or Manager creates a standardized onboarding checklist template (e.g., "Complete HR paperwork", "Set up development environment", "Meet team members").
- When a new recruit is created, a checklist instance is generated from the template.
- Recruit can check off items as they complete them.
- Manager sees checklist completion status on their dashboard.
- **API:** `GET/POST /api/checklists`, `PATCH /api/checklists/:id/items/:itemId` (toggle completion).

### 10.2 Global Search

- A search bar in the navigation that searches across all entry types (tasks, issues, feedback, notes).
- Full-text search on title, description/content, and tags.
- Results grouped by category with links to individual entries.
- **API:** `GET /api/search?q=keyword&category=all`

### 10.3 Dashboard Charts & Analytics

- Task completion trend over time (line chart).
- Issues by severity (pie/donut chart).
- Feedback distribution by type (bar chart).
- Weekly entry activity heatmap.
- Use a charting library (Chart.js, Recharts, or D3.js).

### 10.4 Activity Timeline

- Chronological feed of all entries across categories.
- Shows what the recruit did each day in a timeline format.
- Managers can view a recruit's timeline for a holistic view.
- **API:** `GET /api/timeline?userId=...&dateFrom=...&dateTo=...`

### 10.5 Notifications

- In-app notification bell.
- Recruit receives notifications when assigned to a manager.
- Manager receives notifications when a recruit logs a HIGH/CRITICAL issue.
- Admin receives notifications for new user registrations.
- Optional email notifications (configurable in user settings).

### 10.6 Comments on Entries (Manager/Recruit Interaction)

- Managers can leave comments on recruit entries (tasks, issues, feedback, notes).
- Recruit is notified of new comments.
- Creates a simple feedback loop between manager and recruit.
- **API:** `POST /api/tasks/:id/comments`, `GET /api/tasks/:id/comments`

### 10.7 Entry Templates

- Recruits can save frequently used entry configurations as templates.
- E.g., a "Daily Standup" task template pre-fills category, status, and priority.
- Quick-create from a template with one click.
- **API:** `GET/POST/DELETE /api/templates`

### 10.8 Bulk Operations

- Select multiple entries and perform bulk actions: delete, change status, change priority.
- Useful when a recruit has many entries to update at once.
- **API:** `PATCH /api/tasks/bulk` with `{ "ids": [...], "updates": { "status": "COMPLETED" } }`

### 10.9 Data Export / Import

- Export all personal data as a ZIP archive (JSON or CSV files for each category).
- Import entries from a CSV file (with column mapping).
- Useful for data portability and migration.
- **API:** `GET /api/export`, `POST /api/import`

### 10.10 Dark Mode

- Toggle between light and dark themes.
- Preference saved in user profile / local storage.
- Consistent dark theme across all pages and components.

### 10.11 Onboarding Progress Milestones

- Define milestone markers at specific day intervals (e.g., Day 7, Day 30, Day 60, Day 90).
- Automatic check-in prompts at milestones asking the recruit to reflect on their progress.
- Manager can review milestone reflections.
- **API:** `GET/POST /api/milestones`

### 10.12 Pinned / Starred Entries

- Recruit can pin/star important entries for quick access.
- Pinned entries appear in a dedicated section on the dashboard.
- **API:** `PATCH /api/tasks/:id/pin`, `GET /api/entries/pinned`
