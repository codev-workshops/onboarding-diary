# Onboarding Diary - Technical Requirements Specification

> **Version:** 1.0.0
> **Last Updated:** 2026-05-24
> **Status:** Draft
> **Author:** Devin (Senior Product Architect)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Functional Requirements](#2-functional-requirements)
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [User Stories](#4-user-stories)
5. [Acceptance Criteria](#5-acceptance-criteria)
6. [Role-Based Permissions](#6-role-based-permissions)
7. [Database Entity Design](#7-database-entity-design)
8. [API Endpoint Specifications](#8-api-endpoint-specifications)
9. [Request/Response Payload Examples](#9-requestresponse-payload-examples)
10. [Validation Rules](#10-validation-rules)
11. [UI Page List](#11-ui-page-list)
12. [User Flows](#12-user-flows)
13. [Error Handling Strategy](#13-error-handling-strategy)
14. [Security Considerations](#14-security-considerations)
15. [Suggested Folder Structure](#15-suggested-folder-structure)
16. [Suggested Architecture](#16-suggested-architecture)
17. [State Management Approach](#17-state-management-approach)
18. [Reporting Generation Strategy](#18-reporting-generation-strategy)
19. [Future Extensibility Ideas](#19-future-extensibility-ideas)

---

## 1. Overview

### 1.1 Purpose

The **Onboarding Diary** is a web application designed for new recruits to document their onboarding journey within an organization. It enables new employees to log daily activities, track milestones, reflect on their learning experiences, and receive feedback from their assigned mentors and managers.

### 1.2 Problem Statement

Organizations lack a centralized, structured system for new hires to document their onboarding progress. This leads to:

- No visibility for managers/HR into a new hire's integration progress
- No structured way for recruits to reflect on and track their learning
- Difficulty identifying common onboarding pain points across cohorts
- Loss of institutional knowledge about effective onboarding practices

### 1.3 Target Users

| User Type        | Description                                                                         |
| ---------------- | ----------------------------------------------------------------------------------- |
| **New Recruit**  | A newly hired employee going through the onboarding process                         |
| **Mentor**       | An experienced employee assigned to guide one or more new recruits                  |
| **Manager**      | A team lead or department manager overseeing the onboarding of their direct reports |
| **HR Admin**     | Human resources personnel who configure onboarding programs and generate reports    |
| **System Admin** | Technical administrator managing system configuration, users, and roles             |

### 1.4 Tech Stack

| Layer          | Technology                     |
| -------------- | ------------------------------ |
| Frontend       | React + Vite + TypeScript      |
| Backend        | Node.js + Express + TypeScript |
| Database       | PostgreSQL                     |
| ORM            | Prisma                         |
| Authentication | JWT (Access + Refresh Tokens)  |
| Styling        | Tailwind CSS                   |
| API Style      | REST                           |

---

## 2. Functional Requirements

### 2.1 Authentication & Authorization

| ID         | Requirement                                                                                | Priority |
| ---------- | ------------------------------------------------------------------------------------------ | -------- |
| FR-AUTH-01 | Users shall be able to register with email, full name, and password                        | Must     |
| FR-AUTH-02 | Users shall be able to log in with email and password                                      | Must     |
| FR-AUTH-03 | The system shall issue JWT access tokens (15 min expiry) and refresh tokens (7 day expiry) | Must     |
| FR-AUTH-04 | Users shall be able to log out, which invalidates the refresh token                        | Must     |
| FR-AUTH-05 | Users shall be able to reset their password via email link                                 | Should   |
| FR-AUTH-06 | The system shall enforce role-based access control (RBAC)                                  | Must     |
| FR-AUTH-07 | HR Admins shall be able to invite new users via email                                      | Should   |

### 2.2 User Profile Management

| ID         | Requirement                                                                          | Priority |
| ---------- | ------------------------------------------------------------------------------------ | -------- |
| FR-PROF-01 | Users shall be able to view and update their profile (name, avatar, bio, department) | Must     |
| FR-PROF-02 | Users shall be able to change their password                                         | Must     |
| FR-PROF-03 | HR Admins shall be able to assign roles to users                                     | Must     |
| FR-PROF-04 | HR Admins shall be able to assign mentors to new recruits                            | Must     |
| FR-PROF-05 | Users shall be able to view their assigned mentor/mentees                            | Must     |

### 2.3 Diary Entry Management

| ID          | Requirement                                                                                    | Priority |
| ----------- | ---------------------------------------------------------------------------------------------- | -------- |
| FR-DIARY-01 | New recruits shall be able to create a diary entry for a given date                            | Must     |
| FR-DIARY-02 | Each diary entry shall support a title, rich-text body, mood rating (1-5), and tags            | Must     |
| FR-DIARY-03 | New recruits shall be able to edit their own diary entries                                     | Must     |
| FR-DIARY-04 | New recruits shall be able to soft-delete their own diary entries                              | Must     |
| FR-DIARY-05 | Diary entries shall have a visibility setting: `PRIVATE`, `MENTOR_ONLY`, `TEAM`, `PUBLIC`      | Must     |
| FR-DIARY-06 | Users shall be able to filter diary entries by date range, tags, mood, and visibility          | Must     |
| FR-DIARY-07 | Users shall be able to search diary entries by keyword (title and body)                        | Should   |
| FR-DIARY-08 | Diary entries shall support file attachments (images, PDFs, up to 10 MB each, max 5 per entry) | Should   |

### 2.4 Milestone Tracking

| ID         | Requirement                                                                                  | Priority |
| ---------- | -------------------------------------------------------------------------------------------- | -------- |
| FR-MILE-01 | HR Admins shall be able to define onboarding milestones per onboarding program               | Must     |
| FR-MILE-02 | Milestones shall have a name, description, target day (relative to start date), and category | Must     |
| FR-MILE-03 | New recruits shall be able to mark milestones as complete with an optional note              | Must     |
| FR-MILE-04 | Mentors and managers shall be able to verify/approve milestone completions                   | Should   |
| FR-MILE-05 | The system shall display a progress bar/tracker for each recruit's milestones                | Must     |
| FR-MILE-06 | The system shall send reminders for upcoming milestones (3 days before target date)          | Could    |

### 2.5 Feedback & Comments

| ID         | Requirement                                                                | Priority |
| ---------- | -------------------------------------------------------------------------- | -------- |
| FR-FEED-01 | Mentors shall be able to comment on diary entries visible to them          | Must     |
| FR-FEED-02 | Managers shall be able to comment on diary entries visible to them         | Must     |
| FR-FEED-03 | Comment authors shall be able to edit or soft-delete their own comments    | Must     |
| FR-FEED-04 | The system shall notify the diary entry author when a new comment is added | Should   |

### 2.6 Onboarding Programs

| ID         | Requirement                                                                             | Priority |
| ---------- | --------------------------------------------------------------------------------------- | -------- |
| FR-PROG-01 | HR Admins shall be able to create onboarding programs (e.g., "Engineering 90-Day Plan") | Must     |
| FR-PROG-02 | Each program shall define a set of milestones and a duration (in days)                  | Must     |
| FR-PROG-03 | HR Admins shall be able to assign recruits to an onboarding program                     | Must     |
| FR-PROG-04 | HR Admins shall be able to clone/duplicate an existing program as a template            | Should   |

### 2.7 Notifications

| ID         | Requirement                                                                                              | Priority |
| ---------- | -------------------------------------------------------------------------------------------------------- | -------- |
| FR-NOTF-01 | The system shall generate in-app notifications for comments, milestone reminders, and mentor assignments | Should   |
| FR-NOTF-02 | Users shall be able to mark notifications as read                                                        | Should   |
| FR-NOTF-03 | Users shall see an unread notification count badge                                                       | Should   |

### 2.8 Reporting & Analytics

| ID         | Requirement                                                                                                            | Priority |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-REPT-01 | HR Admins shall be able to view aggregate onboarding progress across all recruits                                      | Must     |
| FR-REPT-02 | Managers shall be able to view their direct reports' onboarding progress                                               | Must     |
| FR-REPT-03 | The system shall provide mood trend analytics per recruit over time                                                    | Should   |
| FR-REPT-04 | HR Admins shall be able to export reports as CSV                                                                       | Should   |
| FR-REPT-05 | The system shall display a dashboard summarizing active onboarding programs, completion rates, and average mood scores | Must     |

---

## 3. Non-Functional Requirements

| ID     | Category             | Requirement                                                        | Target        |
| ------ | -------------------- | ------------------------------------------------------------------ | ------------- |
| NFR-01 | Performance          | API response time for list endpoints                               | < 500ms (p95) |
| NFR-02 | Performance          | API response time for single-resource endpoints                    | < 200ms (p95) |
| NFR-03 | Performance          | Page load time (initial)                                           | < 3 seconds   |
| NFR-04 | Scalability          | Concurrent users supported                                         | 500+          |
| NFR-05 | Scalability          | Total diary entries supported                                      | 1,000,000+    |
| NFR-06 | Availability         | Uptime SLA                                                         | 99.5%         |
| NFR-07 | Security             | All API endpoints authenticated (except login/register)            | Mandatory     |
| NFR-08 | Security             | Passwords hashed with bcrypt (cost factor 12)                      | Mandatory     |
| NFR-09 | Security             | HTTPS enforced in production                                       | Mandatory     |
| NFR-10 | Accessibility        | WCAG 2.1 AA compliance                                             | Should        |
| NFR-11 | Browser Support      | Chrome, Firefox, Safari, Edge (latest 2 versions)                  | Must          |
| NFR-12 | Mobile               | Responsive design (mobile-first)                                   | Must          |
| NFR-13 | Data Retention       | Soft-deleted records retained for 90 days, then permanently purged | Should        |
| NFR-14 | Logging              | Structured JSON logging for all API requests                       | Must          |
| NFR-15 | Internationalization | Support for English initially; architecture must support i18n      | Should        |

---

## 4. User Stories

### 4.1 New Recruit Stories

| ID     | Story                                                                                                    | Priority |
| ------ | -------------------------------------------------------------------------------------------------------- | -------- |
| US-R01 | As a new recruit, I want to create a diary entry so that I can document what I learned today             | Must     |
| US-R02 | As a new recruit, I want to set the visibility of my entry so that I can control who sees my reflections | Must     |
| US-R03 | As a new recruit, I want to tag my entries so that I can categorize my experiences                       | Must     |
| US-R04 | As a new recruit, I want to rate my mood for the day so that I can track my emotional journey            | Must     |
| US-R05 | As a new recruit, I want to see my milestone progress so that I know what I need to complete next        | Must     |
| US-R06 | As a new recruit, I want to mark milestones as done so that my progress is tracked                       | Must     |
| US-R07 | As a new recruit, I want to search my past entries so that I can find specific information quickly       | Should   |
| US-R08 | As a new recruit, I want to attach files to my entries so that I can include screenshots or documents    | Should   |
| US-R09 | As a new recruit, I want to see comments from my mentor so that I can receive guidance                   | Must     |
| US-R10 | As a new recruit, I want to receive notifications when my mentor comments so that I stay informed        | Should   |

### 4.2 Mentor Stories

| ID     | Story                                                                                                          | Priority |
| ------ | -------------------------------------------------------------------------------------------------------------- | -------- |
| US-M01 | As a mentor, I want to view my mentees' diary entries so that I can monitor their progress                     | Must     |
| US-M02 | As a mentor, I want to comment on my mentees' entries so that I can provide feedback                           | Must     |
| US-M03 | As a mentor, I want to see a dashboard of my mentees' milestone progress so that I can identify who needs help | Must     |
| US-M04 | As a mentor, I want to verify milestone completions so that I can confirm genuine progress                     | Should   |

### 4.3 Manager Stories

| ID      | Story                                                                                                     | Priority |
| ------- | --------------------------------------------------------------------------------------------------------- | -------- |
| US-MG01 | As a manager, I want to view my team members' onboarding progress so that I can ensure smooth integration | Must     |
| US-MG02 | As a manager, I want to see mood trends across my team so that I can identify potential issues early      | Should   |
| US-MG03 | As a manager, I want to comment on entries visible to me so that I can provide encouragement              | Must     |

### 4.4 HR Admin Stories

| ID      | Story                                                                                                    | Priority |
| ------- | -------------------------------------------------------------------------------------------------------- | -------- |
| US-HR01 | As an HR admin, I want to create onboarding programs so that I can standardize the onboarding experience | Must     |
| US-HR02 | As an HR admin, I want to define milestones within a program so that recruits have clear goals           | Must     |
| US-HR03 | As an HR admin, I want to assign recruits to programs so that their journey is structured                | Must     |
| US-HR04 | As an HR admin, I want to generate completion reports so that I can assess program effectiveness         | Must     |
| US-HR05 | As an HR admin, I want to export reports as CSV so that I can share them with stakeholders               | Should   |
| US-HR06 | As an HR admin, I want to invite new users so that I can onboard them into the system                    | Should   |
| US-HR07 | As an HR admin, I want to clone programs so that I can reuse templates efficiently                       | Should   |

### 4.5 System Admin Stories

| ID      | Story                                                                                     | Priority |
| ------- | ----------------------------------------------------------------------------------------- | -------- |
| US-SA01 | As a system admin, I want to manage user accounts so that I can activate/deactivate users | Must     |
| US-SA02 | As a system admin, I want to assign roles so that access is properly controlled           | Must     |
| US-SA03 | As a system admin, I want to view audit logs so that I can investigate security events    | Should   |

---

## 5. Acceptance Criteria

### 5.1 Diary Entry Creation (US-R01)

```
GIVEN a logged-in new recruit
WHEN they navigate to "New Entry" and fill in title, body, mood, and tags
AND click "Save"
THEN the entry is saved to the database with the current timestamp
AND the entry appears in their diary feed
AND the entry is created with the selected visibility setting
```

### 5.2 Milestone Completion (US-R06)

```
GIVEN a logged-in new recruit assigned to an onboarding program
WHEN they view their milestones and click "Mark Complete" on an incomplete milestone
AND optionally add a completion note
THEN the milestone status changes to COMPLETED
AND the completion timestamp and note are recorded
AND the progress bar updates accordingly
AND (if configured) a notification is sent to the assigned mentor
```

### 5.3 Mentor Commenting (US-M02)

```
GIVEN a logged-in mentor viewing a mentee's diary entry
WHEN they type a comment and submit it
THEN the comment appears under the diary entry
AND the mentee receives an in-app notification
AND the comment shows the mentor's name and timestamp
```

### 5.4 Program Creation (US-HR01)

```
GIVEN a logged-in HR admin
WHEN they navigate to "Programs" and click "Create Program"
AND fill in program name, description, duration, and add milestones
AND click "Save"
THEN the program is created and appears in the program list
AND the milestones are associated with the program
AND the program is available for recruit assignment
```

### 5.5 Report Generation (US-HR04)

```
GIVEN a logged-in HR admin
WHEN they navigate to "Reports" and select a program and date range
AND click "Generate Report"
THEN the system displays a summary including:
  - Total recruits enrolled
  - Average milestone completion rate
  - Average mood score over time
  - List of recruits with their individual progress
AND the admin can click "Export CSV" to download the data
```

### 5.6 Visibility Control (US-R02)

```
GIVEN a diary entry with visibility set to MENTOR_ONLY
WHEN any user attempts to view the entry
THEN only the entry author and their assigned mentor can see it
AND managers and other users receive a 403 Forbidden response
```

### 5.7 Search Functionality (US-R07)

```
GIVEN a logged-in user with existing diary entries
WHEN they type a keyword in the search bar
THEN the system returns entries matching the keyword in title or body
AND results are paginated (20 per page by default)
AND results are sorted by relevance with most recent first as tiebreaker
```

---

## 6. Role-Based Permissions

### 6.1 Role Definitions

```typescript
enum Role {
  RECRUIT = 'RECRUIT',
  MENTOR = 'MENTOR',
  MANAGER = 'MANAGER',
  HR_ADMIN = 'HR_ADMIN',
  SYS_ADMIN = 'SYS_ADMIN',
}
```

### 6.2 Permission Matrix

| Resource         | Action                      | RECRUIT | MENTOR  | MANAGER | HR_ADMIN | SYS_ADMIN |
| ---------------- | --------------------------- | ------- | ------- | ------- | -------- | --------- |
| **Diary Entry**  | Create Own                  | Yes     | No      | No      | No       | No        |
| **Diary Entry**  | Read Own                    | Yes     | Yes     | Yes     | Yes      | Yes       |
| **Diary Entry**  | Read Mentee's               | --      | Yes     | --      | Yes      | Yes       |
| **Diary Entry**  | Read Team's                 | --      | --      | Yes     | Yes      | Yes       |
| **Diary Entry**  | Update Own                  | Yes     | No      | No      | No       | No        |
| **Diary Entry**  | Delete Own (soft)           | Yes     | No      | No      | No       | Yes       |
| **Comment**      | Create (on visible entries) | Yes     | Yes     | Yes     | Yes      | Yes       |
| **Comment**      | Update Own                  | Yes     | Yes     | Yes     | Yes      | Yes       |
| **Comment**      | Delete Own (soft)           | Yes     | Yes     | Yes     | Yes      | Yes       |
| **Milestone**    | View Own                    | Yes     | --      | --      | Yes      | Yes       |
| **Milestone**    | View Mentee's               | --      | Yes     | --      | Yes      | Yes       |
| **Milestone**    | View Team's                 | --      | --      | Yes     | Yes      | Yes       |
| **Milestone**    | Mark Complete               | Yes     | No      | No      | No       | No        |
| **Milestone**    | Verify/Approve              | --      | Yes     | Yes     | Yes      | Yes       |
| **Program**      | Create                      | No      | No      | No      | Yes      | Yes       |
| **Program**      | Update                      | No      | No      | No      | Yes      | Yes       |
| **Program**      | Delete (soft)               | No      | No      | No      | Yes      | Yes       |
| **Program**      | View                        | Yes     | Yes     | Yes     | Yes      | Yes       |
| **Program**      | Assign Recruit              | No      | No      | No      | Yes      | Yes       |
| **User**         | View Own Profile            | Yes     | Yes     | Yes     | Yes      | Yes       |
| **User**         | Update Own Profile          | Yes     | Yes     | Yes     | Yes      | Yes       |
| **User**         | View Others Profile         | Limited | Limited | Yes     | Yes      | Yes       |
| **User**         | Manage Roles                | No      | No      | No      | Yes      | Yes       |
| **User**         | Activate/Deactivate         | No      | No      | No      | No       | Yes       |
| **Report**       | View Own Progress           | Yes     | --      | --      | --       | --        |
| **Report**       | View Mentee Progress        | --      | Yes     | --      | --       | --        |
| **Report**       | View Team Progress          | --      | --      | Yes     | --       | --        |
| **Report**       | View All / Export           | No      | No      | No      | Yes      | Yes       |
| **Notification** | View Own                    | Yes     | Yes     | Yes     | Yes      | Yes       |

> **Note:** `--` indicates the permission is not applicable for that role. `Limited` means the user can only see basic public profile info (name, department).

### 6.3 Visibility Rules for Diary Entries

| Visibility    | Author     | Mentor | Manager | HR Admin | SYS Admin | Others |
| ------------- | ---------- | ------ | ------- | -------- | --------- | ------ |
| `PRIVATE`     | Read/Write | No     | No      | No       | Read      | No     |
| `MENTOR_ONLY` | Read/Write | Read   | No      | No       | Read      | No     |
| `TEAM`        | Read/Write | Read   | Read    | Read     | Read      | No     |
| `PUBLIC`      | Read/Write | Read   | Read    | Read     | Read      | Read\* |

> \*`PUBLIC` entries are visible to all authenticated users.

---

## 7. Database Entity Design

### 7.1 Entity Relationship Diagram (Textual)

```
User (1) ──── (M) DiaryEntry
User (1) ──── (M) Comment
User (1) ──── (M) MilestoneCompletion
User (1) ──── (M) Notification

User (1) ──── (M) MentorAssignment (as mentor)
User (1) ──── (M) MentorAssignment (as mentee)

User (1) ──── (M) ProgramEnrollment
OnboardingProgram (1) ──── (M) ProgramEnrollment
OnboardingProgram (1) ──── (M) Milestone

DiaryEntry (1) ──── (M) Comment
DiaryEntry (1) ──── (M) DiaryEntryTag (join table)
DiaryEntry (1) ──── (M) Attachment

Tag (1) ──── (M) DiaryEntryTag (join table)

Milestone (1) ──── (M) MilestoneCompletion
```

### 7.2 Entity Definitions

#### 7.2.1 User

| Column          | Type             | Constraints                   | Description                          |
| --------------- | ---------------- | ----------------------------- | ------------------------------------ |
| `id`            | UUID             | PK, DEFAULT gen_random_uuid() | Unique identifier                    |
| `email`         | VARCHAR(255)     | UNIQUE, NOT NULL              | User's email address                 |
| `password_hash` | VARCHAR(255)     | NOT NULL                      | Bcrypt-hashed password               |
| `first_name`    | VARCHAR(100)     | NOT NULL                      | First name                           |
| `last_name`     | VARCHAR(100)     | NOT NULL                      | Last name                            |
| `avatar_url`    | VARCHAR(500)     | NULLABLE                      | Profile picture URL                  |
| `bio`           | TEXT             | NULLABLE                      | Short biography                      |
| `department`    | VARCHAR(100)     | NULLABLE                      | Department name                      |
| `role`          | ENUM(Role)       | NOT NULL, DEFAULT 'RECRUIT'   | User role                            |
| `status`        | ENUM(UserStatus) | NOT NULL, DEFAULT 'ACTIVE'    | Account status                       |
| `start_date`    | DATE             | NULLABLE                      | Onboarding start date (for recruits) |
| `last_login_at` | TIMESTAMPTZ      | NULLABLE                      | Last login timestamp                 |
| `created_at`    | TIMESTAMPTZ      | NOT NULL, DEFAULT NOW()       | Record creation timestamp            |
| `updated_at`    | TIMESTAMPTZ      | NOT NULL, DEFAULT NOW()       | Record update timestamp              |
| `deleted_at`    | TIMESTAMPTZ      | NULLABLE                      | Soft delete timestamp                |

**Indexes:**

- `idx_user_email` UNIQUE on `email`
- `idx_user_role` on `role`
- `idx_user_status` on `status`
- `idx_user_department` on `department`
- `idx_user_deleted_at` on `deleted_at` (partial index WHERE deleted_at IS NULL)

**Enums:**

```typescript
enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  INVITED = 'INVITED',
}
```

#### 7.2.2 DiaryEntry

| Column        | Type             | Constraints                     | Description                                    |
| ------------- | ---------------- | ------------------------------- | ---------------------------------------------- |
| `id`          | UUID             | PK, DEFAULT gen_random_uuid()   | Unique identifier                              |
| `user_id`     | UUID             | FK -> User(id), NOT NULL        | Author of the entry                            |
| `title`       | VARCHAR(255)     | NOT NULL                        | Entry title                                    |
| `body`        | TEXT             | NOT NULL                        | Rich-text content (stored as HTML or Markdown) |
| `mood_rating` | SMALLINT         | NOT NULL, CHECK (1-5)           | Mood score for the day                         |
| `entry_date`  | DATE             | NOT NULL                        | The date this entry is for                     |
| `visibility`  | ENUM(Visibility) | NOT NULL, DEFAULT 'MENTOR_ONLY' | Who can see this entry                         |
| `created_at`  | TIMESTAMPTZ      | NOT NULL, DEFAULT NOW()         | Record creation timestamp                      |
| `updated_at`  | TIMESTAMPTZ      | NOT NULL, DEFAULT NOW()         | Record update timestamp                        |
| `deleted_at`  | TIMESTAMPTZ      | NULLABLE                        | Soft delete timestamp                          |

**Indexes:**

- `idx_diary_user_id` on `user_id`
- `idx_diary_entry_date` on `entry_date`
- `idx_diary_user_date` UNIQUE on `(user_id, entry_date)` WHERE `deleted_at IS NULL` (one entry per day per user)
- `idx_diary_visibility` on `visibility`
- `idx_diary_mood` on `mood_rating`
- `idx_diary_deleted_at` on `deleted_at` (partial index WHERE deleted_at IS NULL)
- GIN index on `title` and `body` for full-text search (PostgreSQL `tsvector`)

**Enums:**

```typescript
enum Visibility {
  PRIVATE = 'PRIVATE',
  MENTOR_ONLY = 'MENTOR_ONLY',
  TEAM = 'TEAM',
  PUBLIC = 'PUBLIC',
}
```

#### 7.2.3 Tag

| Column       | Type        | Constraints                   | Description               |
| ------------ | ----------- | ----------------------------- | ------------------------- |
| `id`         | UUID        | PK, DEFAULT gen_random_uuid() | Unique identifier         |
| `name`       | VARCHAR(50) | UNIQUE, NOT NULL              | Tag display name          |
| `slug`       | VARCHAR(50) | UNIQUE, NOT NULL              | URL-friendly identifier   |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | Record creation timestamp |

**Indexes:**

- `idx_tag_name` UNIQUE on `name`
- `idx_tag_slug` UNIQUE on `slug`

#### 7.2.4 DiaryEntryTag (Join Table)

| Column           | Type | Constraints                    | Description              |
| ---------------- | ---- | ------------------------------ | ------------------------ |
| `diary_entry_id` | UUID | FK -> DiaryEntry(id), NOT NULL | Reference to diary entry |
| `tag_id`         | UUID | FK -> Tag(id), NOT NULL        | Reference to tag         |

**Indexes:**

- PK on `(diary_entry_id, tag_id)`
- `idx_entry_tag_tag_id` on `tag_id`

#### 7.2.5 Attachment

| Column           | Type         | Constraints                    | Description        |
| ---------------- | ------------ | ------------------------------ | ------------------ |
| `id`             | UUID         | PK, DEFAULT gen_random_uuid()  | Unique identifier  |
| `diary_entry_id` | UUID         | FK -> DiaryEntry(id), NOT NULL | Parent diary entry |
| `file_name`      | VARCHAR(255) | NOT NULL                       | Original file name |
| `file_url`       | VARCHAR(500) | NOT NULL                       | Storage URL/path   |
| `file_size`      | INTEGER      | NOT NULL                       | File size in bytes |
| `mime_type`      | VARCHAR(100) | NOT NULL                       | MIME type          |
| `created_at`     | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()        | Upload timestamp   |

**Indexes:**

- `idx_attachment_entry_id` on `diary_entry_id`

#### 7.2.6 Comment

| Column           | Type        | Constraints                    | Description               |
| ---------------- | ----------- | ------------------------------ | ------------------------- |
| `id`             | UUID        | PK, DEFAULT gen_random_uuid()  | Unique identifier         |
| `diary_entry_id` | UUID        | FK -> DiaryEntry(id), NOT NULL | Parent diary entry        |
| `user_id`        | UUID        | FK -> User(id), NOT NULL       | Comment author            |
| `body`           | TEXT        | NOT NULL                       | Comment content           |
| `created_at`     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()        | Record creation timestamp |
| `updated_at`     | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()        | Record update timestamp   |
| `deleted_at`     | TIMESTAMPTZ | NULLABLE                       | Soft delete timestamp     |

**Indexes:**

- `idx_comment_entry_id` on `diary_entry_id`
- `idx_comment_user_id` on `user_id`
- `idx_comment_deleted_at` on `deleted_at` (partial index WHERE deleted_at IS NULL)

#### 7.2.7 OnboardingProgram

| Column          | Type         | Constraints                   | Description                                 |
| --------------- | ------------ | ----------------------------- | ------------------------------------------- |
| `id`            | UUID         | PK, DEFAULT gen_random_uuid() | Unique identifier                           |
| `name`          | VARCHAR(200) | NOT NULL                      | Program name                                |
| `description`   | TEXT         | NULLABLE                      | Program description                         |
| `duration_days` | INTEGER      | NOT NULL, CHECK (> 0)         | Program duration in days                    |
| `is_active`     | BOOLEAN      | NOT NULL, DEFAULT true        | Whether program is available for enrollment |
| `created_by`    | UUID         | FK -> User(id), NOT NULL      | Creator of the program                      |
| `created_at`    | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | Record creation timestamp                   |
| `updated_at`    | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | Record update timestamp                     |
| `deleted_at`    | TIMESTAMPTZ  | NULLABLE                      | Soft delete timestamp                       |

**Indexes:**

- `idx_program_active` on `is_active`
- `idx_program_deleted_at` on `deleted_at` (partial index WHERE deleted_at IS NULL)

#### 7.2.8 Milestone

| Column        | Type                    | Constraints                           | Description                       |
| ------------- | ----------------------- | ------------------------------------- | --------------------------------- |
| `id`          | UUID                    | PK, DEFAULT gen_random_uuid()         | Unique identifier                 |
| `program_id`  | UUID                    | FK -> OnboardingProgram(id), NOT NULL | Parent program                    |
| `name`        | VARCHAR(200)            | NOT NULL                              | Milestone name                    |
| `description` | TEXT                    | NULLABLE                              | What the milestone entails        |
| `target_day`  | INTEGER                 | NOT NULL, CHECK (> 0)                 | Day number relative to start date |
| `category`    | ENUM(MilestoneCategory) | NOT NULL                              | Milestone category                |
| `sort_order`  | INTEGER                 | NOT NULL, DEFAULT 0                   | Display ordering                  |
| `created_at`  | TIMESTAMPTZ             | NOT NULL, DEFAULT NOW()               | Record creation timestamp         |
| `updated_at`  | TIMESTAMPTZ             | NOT NULL, DEFAULT NOW()               | Record update timestamp           |

**Indexes:**

- `idx_milestone_program_id` on `program_id`
- `idx_milestone_category` on `category`
- `idx_milestone_sort` on `(program_id, sort_order)`

**Enums:**

```typescript
enum MilestoneCategory {
  ADMINISTRATIVE = 'ADMINISTRATIVE', // e.g., Complete HR paperwork
  TECHNICAL = 'TECHNICAL', // e.g., Set up dev environment
  SOCIAL = 'SOCIAL', // e.g., Meet with 5 team members
  LEARNING = 'LEARNING', // e.g., Complete training module
  DELIVERABLE = 'DELIVERABLE', // e.g., First code review
}
```

#### 7.2.9 ProgramEnrollment

| Column         | Type                   | Constraints                           | Description                  |
| -------------- | ---------------------- | ------------------------------------- | ---------------------------- |
| `id`           | UUID                   | PK, DEFAULT gen_random_uuid()         | Unique identifier            |
| `user_id`      | UUID                   | FK -> User(id), NOT NULL              | Enrolled recruit             |
| `program_id`   | UUID                   | FK -> OnboardingProgram(id), NOT NULL | Enrolled program             |
| `enrolled_at`  | TIMESTAMPTZ            | NOT NULL, DEFAULT NOW()               | Enrollment timestamp         |
| `completed_at` | TIMESTAMPTZ            | NULLABLE                              | Program completion timestamp |
| `status`       | ENUM(EnrollmentStatus) | NOT NULL, DEFAULT 'IN_PROGRESS'       | Enrollment status            |

**Indexes:**

- `idx_enrollment_user` on `user_id`
- `idx_enrollment_program` on `program_id`
- `idx_enrollment_unique` UNIQUE on `(user_id, program_id)`
- `idx_enrollment_status` on `status`

**Enums:**

```typescript
enum EnrollmentStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  WITHDRAWN = 'WITHDRAWN',
}
```

#### 7.2.10 MilestoneCompletion

| Column         | Type                   | Constraints                              | Description                 |
| -------------- | ---------------------- | ---------------------------------------- | --------------------------- |
| `id`           | UUID                   | PK, DEFAULT gen_random_uuid()            | Unique identifier           |
| `milestone_id` | UUID                   | FK -> Milestone(id), NOT NULL            | Completed milestone         |
| `user_id`      | UUID                   | FK -> User(id), NOT NULL                 | Recruit who completed it    |
| `note`         | TEXT                   | NULLABLE                                 | Optional completion note    |
| `status`       | ENUM(CompletionStatus) | NOT NULL, DEFAULT 'PENDING_VERIFICATION' | Completion status           |
| `verified_by`  | UUID                   | FK -> User(id), NULLABLE                 | Mentor/manager who verified |
| `completed_at` | TIMESTAMPTZ            | NOT NULL, DEFAULT NOW()                  | When marked complete        |
| `verified_at`  | TIMESTAMPTZ            | NULLABLE                                 | When verified               |

**Indexes:**

- `idx_completion_milestone` on `milestone_id`
- `idx_completion_user` on `user_id`
- `idx_completion_unique` UNIQUE on `(milestone_id, user_id)`
- `idx_completion_status` on `status`

**Enums:**

```typescript
enum CompletionStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}
```

#### 7.2.11 MentorAssignment

| Column          | Type        | Constraints                   | Description                       |
| --------------- | ----------- | ----------------------------- | --------------------------------- |
| `id`            | UUID        | PK, DEFAULT gen_random_uuid() | Unique identifier                 |
| `mentor_id`     | UUID        | FK -> User(id), NOT NULL      | The mentor                        |
| `mentee_id`     | UUID        | FK -> User(id), NOT NULL      | The new recruit                   |
| `assigned_at`   | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()       | Assignment timestamp              |
| `unassigned_at` | TIMESTAMPTZ | NULLABLE                      | When the assignment ended         |
| `is_active`     | BOOLEAN     | NOT NULL, DEFAULT true        | Whether the assignment is current |

**Indexes:**

- `idx_mentor_assignment_mentor` on `mentor_id`
- `idx_mentor_assignment_mentee` on `mentee_id`
- `idx_mentor_assignment_active` on `(mentee_id, is_active)` WHERE `is_active = true`

#### 7.2.12 Notification

| Column           | Type                   | Constraints                   | Description                                    |
| ---------------- | ---------------------- | ----------------------------- | ---------------------------------------------- |
| `id`             | UUID                   | PK, DEFAULT gen_random_uuid() | Unique identifier                              |
| `user_id`        | UUID                   | FK -> User(id), NOT NULL      | Notification recipient                         |
| `type`           | ENUM(NotificationType) | NOT NULL                      | Notification category                          |
| `title`          | VARCHAR(200)           | NOT NULL                      | Short summary                                  |
| `message`        | TEXT                   | NOT NULL                      | Full notification message                      |
| `reference_type` | VARCHAR(50)            | NULLABLE                      | Entity type (e.g., 'DIARY_ENTRY', 'MILESTONE') |
| `reference_id`   | UUID                   | NULLABLE                      | ID of the referenced entity                    |
| `is_read`        | BOOLEAN                | NOT NULL, DEFAULT false       | Read status                                    |
| `created_at`     | TIMESTAMPTZ            | NOT NULL, DEFAULT NOW()       | Notification timestamp                         |

**Indexes:**

- `idx_notification_user` on `user_id`
- `idx_notification_read` on `(user_id, is_read)` WHERE `is_read = false`
- `idx_notification_created` on `created_at`

**Enums:**

```typescript
enum NotificationType {
  COMMENT_ADDED = 'COMMENT_ADDED',
  MILESTONE_REMINDER = 'MILESTONE_REMINDER',
  MILESTONE_VERIFIED = 'MILESTONE_VERIFIED',
  MILESTONE_REJECTED = 'MILESTONE_REJECTED',
  MENTOR_ASSIGNED = 'MENTOR_ASSIGNED',
  PROGRAM_ENROLLED = 'PROGRAM_ENROLLED',
}
```

#### 7.2.13 RefreshToken

| Column       | Type         | Constraints                   | Description                       |
| ------------ | ------------ | ----------------------------- | --------------------------------- |
| `id`         | UUID         | PK, DEFAULT gen_random_uuid() | Unique identifier                 |
| `user_id`    | UUID         | FK -> User(id), NOT NULL      | Token owner                       |
| `token_hash` | VARCHAR(255) | UNIQUE, NOT NULL              | SHA-256 hash of the refresh token |
| `expires_at` | TIMESTAMPTZ  | NOT NULL                      | Expiration timestamp              |
| `revoked_at` | TIMESTAMPTZ  | NULLABLE                      | When token was revoked            |
| `created_at` | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()       | Token creation timestamp          |
| `user_agent` | VARCHAR(500) | NULLABLE                      | Browser/client info               |
| `ip_address` | VARCHAR(45)  | NULLABLE                      | Client IP address                 |

**Indexes:**

- `idx_refresh_token_hash` UNIQUE on `token_hash`
- `idx_refresh_token_user` on `user_id`
- `idx_refresh_token_expires` on `expires_at`

### 7.3 Soft Delete Strategy

All entities that support soft delete use a `deleted_at` TIMESTAMPTZ column:

- **NULL** = record is active
- **Non-NULL** = record is soft-deleted (timestamp of deletion)
- All queries MUST include `WHERE deleted_at IS NULL` by default (enforced via Prisma middleware)
- Partial indexes on `deleted_at IS NULL` ensure no performance penalty for active record queries
- A scheduled job (cron) permanently purges records where `deleted_at < NOW() - INTERVAL '90 days'`

### 7.4 Audit Timestamps

Every entity includes:

- `created_at` TIMESTAMPTZ DEFAULT NOW() - set on insert, never modified
- `updated_at` TIMESTAMPTZ DEFAULT NOW() - automatically updated via Prisma `@updatedAt`

---

## 8. API Endpoint Specifications

### 8.1 Authentication

| Method | Path                           | Description                  | Auth Required              |
| ------ | ------------------------------ | ---------------------------- | -------------------------- |
| POST   | `/api/v1/auth/register`        | Register a new user          | No                         |
| POST   | `/api/v1/auth/login`           | Login and receive tokens     | No                         |
| POST   | `/api/v1/auth/refresh`         | Refresh access token         | No (refresh token in body) |
| POST   | `/api/v1/auth/logout`          | Revoke refresh token         | Yes                        |
| POST   | `/api/v1/auth/forgot-password` | Request password reset email | No                         |
| POST   | `/api/v1/auth/reset-password`  | Reset password with token    | No                         |

### 8.2 Users

| Method | Path                        | Description                 | Roles               |
| ------ | --------------------------- | --------------------------- | ------------------- |
| GET    | `/api/v1/users/me`          | Get current user profile    | All                 |
| PATCH  | `/api/v1/users/me`          | Update current user profile | All                 |
| PATCH  | `/api/v1/users/me/password` | Change password             | All                 |
| GET    | `/api/v1/users`             | List users (with filters)   | HR_ADMIN, SYS_ADMIN |
| GET    | `/api/v1/users/:id`         | Get user by ID              | Varies by role      |
| PATCH  | `/api/v1/users/:id/role`    | Update user role            | HR_ADMIN, SYS_ADMIN |
| PATCH  | `/api/v1/users/:id/status`  | Activate/deactivate user    | SYS_ADMIN           |

### 8.3 Diary Entries

| Method | Path                                  | Description                                          | Roles                                |
| ------ | ------------------------------------- | ---------------------------------------------------- | ------------------------------------ |
| POST   | `/api/v1/diary-entries`               | Create a new diary entry                             | RECRUIT                              |
| GET    | `/api/v1/diary-entries`               | List own diary entries (paginated, filterable)       | RECRUIT                              |
| GET    | `/api/v1/diary-entries/:id`           | Get a single diary entry                             | Owner or permitted viewer            |
| PATCH  | `/api/v1/diary-entries/:id`           | Update a diary entry                                 | Owner only                           |
| DELETE | `/api/v1/diary-entries/:id`           | Soft-delete a diary entry                            | Owner only                           |
| GET    | `/api/v1/users/:userId/diary-entries` | List a specific user's entries (visibility-filtered) | MENTOR, MANAGER, HR_ADMIN, SYS_ADMIN |
| GET    | `/api/v1/diary-entries/search`        | Full-text search across entries                      | All (scoped by permissions)          |

### 8.4 Tags

| Method | Path           | Description      | Roles |
| ------ | -------------- | ---------------- | ----- |
| GET    | `/api/v1/tags` | List all tags    | All   |
| POST   | `/api/v1/tags` | Create a new tag | All   |

### 8.5 Comments

| Method | Path                                      | Description               | Roles                     |
| ------ | ----------------------------------------- | ------------------------- | ------------------------- |
| POST   | `/api/v1/diary-entries/:entryId/comments` | Add comment to an entry   | All (if entry is visible) |
| GET    | `/api/v1/diary-entries/:entryId/comments` | List comments on an entry | All (if entry is visible) |
| PATCH  | `/api/v1/comments/:id`                    | Update a comment          | Owner only                |
| DELETE | `/api/v1/comments/:id`                    | Soft-delete a comment     | Owner only                |

### 8.6 Onboarding Programs

| Method | Path                         | Description                         | Roles               |
| ------ | ---------------------------- | ----------------------------------- | ------------------- |
| POST   | `/api/v1/programs`           | Create an onboarding program        | HR_ADMIN, SYS_ADMIN |
| GET    | `/api/v1/programs`           | List all programs                   | All                 |
| GET    | `/api/v1/programs/:id`       | Get program details with milestones | All                 |
| PATCH  | `/api/v1/programs/:id`       | Update a program                    | HR_ADMIN, SYS_ADMIN |
| DELETE | `/api/v1/programs/:id`       | Soft-delete a program               | HR_ADMIN, SYS_ADMIN |
| POST   | `/api/v1/programs/:id/clone` | Clone a program as template         | HR_ADMIN, SYS_ADMIN |

### 8.7 Milestones

| Method | Path                                     | Description              | Roles               |
| ------ | ---------------------------------------- | ------------------------ | ------------------- |
| POST   | `/api/v1/programs/:programId/milestones` | Add milestone to program | HR_ADMIN, SYS_ADMIN |
| PATCH  | `/api/v1/milestones/:id`                 | Update a milestone       | HR_ADMIN, SYS_ADMIN |
| DELETE | `/api/v1/milestones/:id`                 | Delete a milestone       | HR_ADMIN, SYS_ADMIN |

### 8.8 Enrollment & Milestone Completion

| Method | Path                                       | Description                    | Roles                            |
| ------ | ------------------------------------------ | ------------------------------ | -------------------------------- |
| POST   | `/api/v1/programs/:programId/enroll`       | Enroll a recruit in a program  | HR_ADMIN, SYS_ADMIN              |
| GET    | `/api/v1/users/:userId/enrollments`        | Get user's program enrollments | Owner, MENTOR, MANAGER, HR_ADMIN |
| GET    | `/api/v1/users/:userId/milestones`         | Get user's milestone progress  | Owner, MENTOR, MANAGER, HR_ADMIN |
| POST   | `/api/v1/milestones/:milestoneId/complete` | Mark milestone as complete     | RECRUIT (own only)               |
| POST   | `/api/v1/milestone-completions/:id/verify` | Verify a milestone completion  | MENTOR, MANAGER, HR_ADMIN        |
| POST   | `/api/v1/milestone-completions/:id/reject` | Reject a milestone completion  | MENTOR, MANAGER, HR_ADMIN        |

### 8.9 Mentor Assignments

| Method | Path                             | Description                 | Roles                   |
| ------ | -------------------------------- | --------------------------- | ----------------------- |
| POST   | `/api/v1/mentor-assignments`     | Assign a mentor to a mentee | HR_ADMIN, SYS_ADMIN     |
| GET    | `/api/v1/users/:userId/mentees`  | Get a mentor's mentees      | MENTOR (own), HR_ADMIN  |
| GET    | `/api/v1/users/:userId/mentor`   | Get a recruit's mentor      | RECRUIT (own), HR_ADMIN |
| PATCH  | `/api/v1/mentor-assignments/:id` | Deactivate an assignment    | HR_ADMIN, SYS_ADMIN     |

### 8.10 Notifications

| Method | Path                                 | Description                      | Roles      |
| ------ | ------------------------------------ | -------------------------------- | ---------- |
| GET    | `/api/v1/notifications`              | Get current user's notifications | All        |
| PATCH  | `/api/v1/notifications/:id/read`     | Mark notification as read        | Owner only |
| PATCH  | `/api/v1/notifications/read-all`     | Mark all as read                 | Owner only |
| GET    | `/api/v1/notifications/unread-count` | Get unread count                 | All        |

### 8.11 Reports

| Method | Path                                 | Description               | Roles                          |
| ------ | ------------------------------------ | ------------------------- | ------------------------------ |
| GET    | `/api/v1/reports/dashboard`          | Dashboard summary stats   | MANAGER, HR_ADMIN              |
| GET    | `/api/v1/reports/program/:programId` | Program completion report | HR_ADMIN                       |
| GET    | `/api/v1/reports/mood-trends`        | Mood trend analytics      | MANAGER (team), HR_ADMIN (all) |
| GET    | `/api/v1/reports/export/csv`         | Export report data as CSV | HR_ADMIN                       |

### 8.12 Attachments

| Method | Path                                         | Description          | Roles                    |
| ------ | -------------------------------------------- | -------------------- | ------------------------ |
| POST   | `/api/v1/diary-entries/:entryId/attachments` | Upload attachment    | RECRUIT (own entry only) |
| DELETE | `/api/v1/attachments/:id`                    | Delete an attachment | RECRUIT (own entry only) |

### 8.13 Pagination & Filtering Convention

All list endpoints follow a consistent pattern:

**Query Parameters:**

- `page` (integer, default: 1) - Page number
- `limit` (integer, default: 20, max: 100) - Items per page
- `sort_by` (string) - Column to sort by
- `sort_order` (string, default: 'desc') - `asc` or `desc`
- Resource-specific filters (e.g., `mood_min`, `mood_max`, `tag`, `from_date`, `to_date`, `visibility`)

**Response Envelope:**

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total_count": 142,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

---

## 9. Request/Response Payload Examples

### 9.1 POST `/api/v1/auth/register`

**Request:**

```json
{
  "email": "jane.doe@company.com",
  "password": "SecureP@ss123",
  "first_name": "Jane",
  "last_name": "Doe",
  "department": "Engineering"
}
```

**Response (201 Created):**

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "jane.doe@company.com",
    "first_name": "Jane",
    "last_name": "Doe",
    "department": "Engineering",
    "role": "RECRUIT",
    "status": "ACTIVE",
    "created_at": "2026-05-24T10:00:00.000Z"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expires_in": 900
  }
}
```

### 9.2 POST `/api/v1/auth/login`

**Request:**

```json
{
  "email": "jane.doe@company.com",
  "password": "SecureP@ss123"
}
```

**Response (200 OK):**

```json
{
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "jane.doe@company.com",
    "first_name": "Jane",
    "last_name": "Doe",
    "role": "RECRUIT"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g...",
    "expires_in": 900
  }
}
```

### 9.3 POST `/api/v1/diary-entries`

**Request:**

```json
{
  "title": "Day 3 - Setting Up My Development Environment",
  "body": "<p>Today I set up my local development environment. I installed Node.js, Docker, and configured my IDE. My mentor helped me understand the project structure and coding conventions.</p><p>Key takeaways:</p><ul><li>The monorepo uses Turborepo</li><li>We follow conventional commits</li><li>PR reviews require 2 approvals</li></ul>",
  "mood_rating": 4,
  "entry_date": "2026-05-24",
  "visibility": "MENTOR_ONLY",
  "tags": ["development", "setup", "tools"]
}
```

**Response (201 Created):**

```json
{
  "data": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Day 3 - Setting Up My Development Environment",
    "body": "<p>Today I set up my local development environment...</p>",
    "mood_rating": 4,
    "entry_date": "2026-05-24",
    "visibility": "MENTOR_ONLY",
    "tags": [
      { "id": "t1", "name": "development", "slug": "development" },
      { "id": "t2", "name": "setup", "slug": "setup" },
      { "id": "t3", "name": "tools", "slug": "tools" }
    ],
    "attachments": [],
    "comment_count": 0,
    "created_at": "2026-05-24T17:30:00.000Z",
    "updated_at": "2026-05-24T17:30:00.000Z"
  }
}
```

### 9.4 GET `/api/v1/diary-entries?page=1&limit=10&mood_min=3&tag=development`

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "title": "Day 3 - Setting Up My Development Environment",
      "mood_rating": 4,
      "entry_date": "2026-05-24",
      "visibility": "MENTOR_ONLY",
      "tags": [{ "id": "t1", "name": "development", "slug": "development" }],
      "comment_count": 2,
      "created_at": "2026-05-24T17:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total_count": 1,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

### 9.5 POST `/api/v1/diary-entries/:entryId/comments`

**Request:**

```json
{
  "body": "Great progress, Jane! For tomorrow, try exploring the CI/CD pipeline setup as well."
}
```

**Response (201 Created):**

```json
{
  "data": {
    "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "diary_entry_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "user_id": "m1n2o3p4-q5r6-7890-stuv-wx1234567890",
    "body": "Great progress, Jane! For tomorrow, try exploring the CI/CD pipeline setup as well.",
    "author": {
      "id": "m1n2o3p4-q5r6-7890-stuv-wx1234567890",
      "first_name": "John",
      "last_name": "Smith",
      "role": "MENTOR"
    },
    "created_at": "2026-05-24T18:00:00.000Z",
    "updated_at": "2026-05-24T18:00:00.000Z"
  }
}
```

### 9.6 POST `/api/v1/programs`

**Request:**

```json
{
  "name": "Engineering 90-Day Onboarding Plan",
  "description": "A comprehensive 90-day onboarding program for new software engineers covering technical setup, team integration, and first deliverables.",
  "duration_days": 90,
  "milestones": [
    {
      "name": "Complete HR Paperwork",
      "description": "Submit all required HR documents including tax forms, benefits enrollment, and emergency contacts.",
      "target_day": 1,
      "category": "ADMINISTRATIVE",
      "sort_order": 1
    },
    {
      "name": "Set Up Development Environment",
      "description": "Install required tools, configure IDE, clone repositories, and run the project locally.",
      "target_day": 3,
      "category": "TECHNICAL",
      "sort_order": 2
    },
    {
      "name": "Meet 5 Team Members",
      "description": "Schedule and complete 1-on-1 coffee chats with at least 5 team members.",
      "target_day": 14,
      "category": "SOCIAL",
      "sort_order": 3
    },
    {
      "name": "Complete Security Training",
      "description": "Finish the mandatory security awareness training module.",
      "target_day": 7,
      "category": "LEARNING",
      "sort_order": 4
    },
    {
      "name": "First Pull Request Merged",
      "description": "Submit and get your first pull request approved and merged.",
      "target_day": 30,
      "category": "DELIVERABLE",
      "sort_order": 5
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "data": {
    "id": "p1r2o3g4-r5a6-m789-0abc-def123456789",
    "name": "Engineering 90-Day Onboarding Plan",
    "description": "A comprehensive 90-day onboarding program...",
    "duration_days": 90,
    "is_active": true,
    "milestone_count": 5,
    "enrollment_count": 0,
    "created_by": {
      "id": "hr-admin-uuid",
      "first_name": "Sarah",
      "last_name": "HR"
    },
    "created_at": "2026-05-24T09:00:00.000Z"
  }
}
```

### 9.7 GET `/api/v1/reports/dashboard`

**Response (200 OK):**

```json
{
  "data": {
    "summary": {
      "active_programs": 3,
      "active_recruits": 15,
      "avg_completion_rate": 72.5,
      "avg_mood_score": 3.8
    },
    "programs": [
      {
        "id": "p1r2o3g4-r5a6-m789-0abc-def123456789",
        "name": "Engineering 90-Day Onboarding Plan",
        "enrolled_count": 8,
        "avg_completion_rate": 65.0,
        "avg_mood_score": 4.1
      }
    ],
    "mood_trend": [
      { "week": "2026-W20", "avg_mood": 3.5 },
      { "week": "2026-W21", "avg_mood": 3.8 },
      { "week": "2026-W22", "avg_mood": 4.1 }
    ],
    "recent_completions": [
      {
        "recruit_name": "Jane Doe",
        "milestone_name": "First Pull Request Merged",
        "completed_at": "2026-05-23T14:00:00.000Z"
      }
    ]
  }
}
```

### 9.8 POST `/api/v1/milestones/:milestoneId/complete`

**Request:**

```json
{
  "note": "Completed HR paperwork submission. All tax forms and benefits enrollment are done. Submitted via the HR portal."
}
```

**Response (200 OK):**

```json
{
  "data": {
    "id": "mc-uuid-123",
    "milestone_id": "milestone-uuid",
    "user_id": "recruit-uuid",
    "note": "Completed HR paperwork submission...",
    "status": "PENDING_VERIFICATION",
    "completed_at": "2026-05-24T11:00:00.000Z",
    "verified_by": null,
    "verified_at": null
  }
}
```

### 9.9 Error Response Format

All error responses follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is already registered"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ]
  }
}
```

---

## 10. Validation Rules

### 10.1 User Registration

| Field        | Rules                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| `email`      | Required, valid email format, max 255 chars, unique (case-insensitive)                                     |
| `password`   | Required, min 8 chars, max 128 chars, must contain: 1 uppercase, 1 lowercase, 1 digit, 1 special character |
| `first_name` | Required, min 1 char, max 100 chars, letters/spaces/hyphens only                                           |
| `last_name`  | Required, min 1 char, max 100 chars, letters/spaces/hyphens only                                           |
| `department` | Optional, max 100 chars                                                                                    |

### 10.2 Login

| Field      | Rules                        |
| ---------- | ---------------------------- |
| `email`    | Required, valid email format |
| `password` | Required, non-empty          |

### 10.3 Diary Entry

| Field         | Rules                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `title`       | Required, min 3 chars, max 255 chars                                                             |
| `body`        | Required, min 10 chars, max 50,000 chars                                                         |
| `mood_rating` | Required, integer, 1-5 inclusive                                                                 |
| `entry_date`  | Required, valid date (ISO 8601), cannot be in the future, cannot be more than 7 days in the past |
| `visibility`  | Required, must be one of: PRIVATE, MENTOR_ONLY, TEAM, PUBLIC                                     |
| `tags`        | Optional, array of strings, max 10 tags, each tag max 50 chars, alphanumeric + hyphens           |

### 10.4 Comment

| Field  | Rules                                 |
| ------ | ------------------------------------- |
| `body` | Required, min 1 char, max 5,000 chars |

### 10.5 Onboarding Program

| Field           | Rules                                |
| --------------- | ------------------------------------ |
| `name`          | Required, min 3 chars, max 200 chars |
| `description`   | Optional, max 5,000 chars            |
| `duration_days` | Required, integer, 1-365 inclusive   |

### 10.6 Milestone

| Field         | Rules                                                |
| ------------- | ---------------------------------------------------- |
| `name`        | Required, min 3 chars, max 200 chars                 |
| `description` | Optional, max 2,000 chars                            |
| `target_day`  | Required, integer, 1 to program's duration_days      |
| `category`    | Required, must be valid MilestoneCategory enum value |
| `sort_order`  | Required, integer, >= 0                              |

### 10.7 Attachment

| Field      | Rules                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| File size  | Max 10 MB per file                                                     |
| Count      | Max 5 attachments per diary entry                                      |
| MIME types | Allowed: image/jpeg, image/png, image/gif, image/webp, application/pdf |

### 10.8 Pagination Parameters

| Parameter    | Rules                                        |
| ------------ | -------------------------------------------- |
| `page`       | Integer, min 1, default 1                    |
| `limit`      | Integer, min 1, max 100, default 20          |
| `sort_order` | Must be `asc` or `desc`, default `desc`      |
| `sort_by`    | Must be a valid column name for the resource |

---

## 11. UI Page List

### 11.1 Public Pages (No Auth)

| #   | Page            | Route                    | Description                         |
| --- | --------------- | ------------------------ | ----------------------------------- |
| 1   | Login           | `/login`                 | Email/password login form           |
| 2   | Register        | `/register`              | New account registration form       |
| 3   | Forgot Password | `/forgot-password`       | Email input for password reset      |
| 4   | Reset Password  | `/reset-password/:token` | New password form (from email link) |

### 11.2 Recruit Pages

| #   | Page          | Route             | Description                                                       |
| --- | ------------- | ----------------- | ----------------------------------------------------------------- |
| 5   | Dashboard     | `/dashboard`      | Personal overview: recent entries, milestone progress, mood chart |
| 6   | Diary Feed    | `/diary`          | Chronological list of own diary entries with filters              |
| 7   | New Entry     | `/diary/new`      | Create a new diary entry form                                     |
| 8   | Edit Entry    | `/diary/:id/edit` | Edit an existing diary entry                                      |
| 9   | Entry Detail  | `/diary/:id`      | View a single entry with comments                                 |
| 10  | My Milestones | `/milestones`     | View and manage milestone progress                                |
| 11  | Profile       | `/profile`        | View/edit own profile                                             |
| 12  | Notifications | `/notifications`  | List of notifications                                             |

### 11.3 Mentor Pages

| #   | Page             | Route                 | Description                                     |
| --- | ---------------- | --------------------- | ----------------------------------------------- |
| 13  | Mentor Dashboard | `/mentor/dashboard`   | Overview of all mentees and their progress      |
| 14  | Mentee Detail    | `/mentor/mentees/:id` | View a specific mentee's entries and milestones |

### 11.4 Manager Pages

| #   | Page               | Route                | Description                            |
| --- | ------------------ | -------------------- | -------------------------------------- |
| 15  | Team Dashboard     | `/manager/dashboard` | Team onboarding overview               |
| 16  | Team Member Detail | `/manager/team/:id`  | View a specific team member's progress |

### 11.5 HR Admin Pages

| #   | Page            | Route                      | Description                                      |
| --- | --------------- | -------------------------- | ------------------------------------------------ |
| 17  | HR Dashboard    | `/admin/dashboard`         | Organization-wide onboarding analytics           |
| 18  | Programs List   | `/admin/programs`          | List and manage onboarding programs              |
| 19  | Program Detail  | `/admin/programs/:id`      | View/edit program with milestones                |
| 20  | Create Program  | `/admin/programs/new`      | Create a new onboarding program                  |
| 21  | Edit Program    | `/admin/programs/:id/edit` | Edit program and milestones                      |
| 22  | User Management | `/admin/users`             | List, filter, and manage users                   |
| 23  | User Detail     | `/admin/users/:id`         | View/edit user details, assign roles and mentors |
| 24  | Reports         | `/admin/reports`           | Generate and export reports                      |
| 25  | Invite User     | `/admin/users/invite`      | Send invitation email to new user                |

### 11.6 System Admin Pages

| #   | Page            | Route                | Description                 |
| --- | --------------- | -------------------- | --------------------------- |
| 26  | System Settings | `/system/settings`   | Global system configuration |
| 27  | Audit Logs      | `/system/audit-logs` | View system audit trail     |

### 11.7 Shared Components

| Component        | Description                                                               |
| ---------------- | ------------------------------------------------------------------------- |
| Navbar           | Top navigation with role-based menu items, notification bell, user avatar |
| Sidebar          | Left sidebar with navigation links (collapsible on mobile)                |
| Breadcrumbs      | Contextual breadcrumb trail                                               |
| Pagination       | Reusable pagination component                                             |
| Search Bar       | Global search with type-ahead suggestions                                 |
| Modal            | Confirmation dialogs, quick-view modals                                   |
| Toast            | Success/error notification toasts                                         |
| Loading Skeleton | Content loading placeholders                                              |
| Empty State      | Illustrations for empty lists/searches                                    |
| Error Boundary   | Graceful error fallback UI                                                |

---

## 12. User Flows

### 12.1 New Recruit Onboarding Flow

```
1. Recruit receives invitation email
   └─> 2. Clicks registration link
       └─> 3. Fills registration form (name, email, password)
           └─> 4. Account created, auto-assigned RECRUIT role
               └─> 5. Redirected to Dashboard
                   ├─> 6a. Views assigned program & milestones
                   ├─> 6b. Creates first diary entry
                   └─> 6c. Views mentor information
```

### 12.2 Daily Diary Entry Flow

```
1. Recruit logs in
   └─> 2. Navigates to "New Entry"
       └─> 3. Fills in:
           ├─ Title
           ├─ Body (rich text)
           ├─ Mood rating (1-5 stars)
           ├─ Tags (select or create)
           ├─ Visibility (dropdown)
           └─ Optional: file attachments
               └─> 4. Clicks "Save Entry"
                   └─> 5. Entry saved, toast notification shown
                       └─> 6. Redirected to entry detail page
                           └─> 7. Mentor receives notification (if visibility allows)
```

### 12.3 Mentor Review & Feedback Flow

```
1. Mentor logs in
   └─> 2. Views Mentor Dashboard
       └─> 3. Selects a mentee from the list
           └─> 4. Views mentee's diary entries (filtered by visibility)
               └─> 5. Opens a specific entry
                   └─> 6. Reads the entry content
                       └─> 7. Types and submits a comment
                           └─> 8. Comment saved, mentee notified
```

### 12.4 Milestone Completion & Verification Flow

```
1. Recruit views "My Milestones"
   └─> 2. Clicks "Mark Complete" on a milestone
       └─> 3. Optionally adds a completion note
           └─> 4. Status set to PENDING_VERIFICATION
               └─> 5. Mentor receives notification
                   └─> 6. Mentor views milestone details
                       ├─> 7a. Clicks "Verify" → status = VERIFIED
                       └─> 7b. Clicks "Reject" with reason → status = REJECTED
                           └─> 8. Recruit notified of decision
```

### 12.5 HR Admin Program Setup Flow

```
1. HR Admin logs in
   └─> 2. Navigates to Programs
       └─> 3. Clicks "Create Program"
           └─> 4. Fills in program details (name, description, duration)
               └─> 5. Adds milestones one by one
                   ├─ Name, description, target day, category
                   └─ Reorders via drag-and-drop
                       └─> 6. Saves program
                           └─> 7. Navigates to User Management
                               └─> 8. Selects a recruit
                                   └─> 9. Enrolls recruit in program
                                       └─> 10. Recruit notified, milestones appear on their dashboard
```

### 12.6 Password Reset Flow

```
1. User clicks "Forgot Password" on login page
   └─> 2. Enters email address
       └─> 3. System sends reset email (regardless of email existence for security)
           └─> 4. User clicks reset link in email
               └─> 5. Enters new password (twice)
                   └─> 6. Password updated, all existing refresh tokens revoked
                       └─> 7. Redirected to login page with success message
```

---

## 13. Error Handling Strategy

### 13.1 Error Classification

| Category            | HTTP Status | Error Code            | Description                                     |
| ------------------- | ----------- | --------------------- | ----------------------------------------------- |
| Validation          | 400         | `VALIDATION_ERROR`    | Input data fails validation rules               |
| Authentication      | 401         | `UNAUTHORIZED`        | Missing or invalid access token                 |
| Token Expired       | 401         | `TOKEN_EXPIRED`       | Access token has expired                        |
| Authorization       | 403         | `FORBIDDEN`           | User lacks required permissions                 |
| Not Found           | 404         | `NOT_FOUND`           | Resource does not exist                         |
| Conflict            | 409         | `CONFLICT`            | Duplicate resource (e.g., email already exists) |
| Rate Limit          | 429         | `RATE_LIMITED`        | Too many requests                               |
| Server Error        | 500         | `INTERNAL_ERROR`      | Unexpected server failure                       |
| Service Unavailable | 503         | `SERVICE_UNAVAILABLE` | Database or external service down               |

### 13.2 Backend Error Handling

- **Global Error Handler Middleware:** Catches all unhandled errors, logs them, and returns a standardized error response. Stack traces are included only in development mode.
- **Validation Layer:** Uses a validation library (e.g., Zod) at the controller level to validate request bodies, query params, and URL params before reaching the service layer.
- **Service Layer:** Throws typed custom exceptions (e.g., `NotFoundError`, `ForbiddenError`) that the global handler maps to appropriate HTTP responses.
- **Database Errors:** Prisma errors (unique constraint violations, foreign key errors) are caught and translated into user-friendly error messages.
- **Unhandled Promise Rejections:** A global handler logs and gracefully shuts down the process.

### 13.3 Frontend Error Handling

- **API Error Interceptor:** Axios/fetch interceptor handles 401 (triggers token refresh), 403 (shows "Access Denied" page), and 5xx (shows generic error with retry option).
- **Error Boundaries:** React Error Boundaries wrap major UI sections to prevent full-page crashes. A fallback UI with "Something went wrong" message and a "Try Again" button is shown.
- **Form Validation:** Client-side validation mirrors backend rules (using the same Zod schemas shared via a common package if monorepo). Inline error messages appear under invalid fields.
- **Toast Notifications:** Success/error toasts for user actions (save, delete, etc.).
- **Loading & Empty States:** All data-fetching components handle loading, error, and empty states gracefully.
- **Offline Handling:** Basic offline detection with a banner ("You are offline. Changes will not be saved.").

### 13.4 Logging Strategy

| Level   | Usage                                                                    |
| ------- | ------------------------------------------------------------------------ |
| `error` | Unhandled exceptions, failed database queries, external service failures |
| `warn`  | Deprecated API usage, rate limit approached, validation failures         |
| `info`  | Successful auth events, CRUD operations, milestone completions           |
| `debug` | Request/response bodies (development only), SQL queries                  |

All logs are structured JSON with fields: `timestamp`, `level`, `message`, `request_id`, `user_id`, `method`, `path`, `status_code`, `duration_ms`.

---

## 14. Security Considerations

### 14.1 Authentication Security

| Measure                | Implementation                                                 |
| ---------------------- | -------------------------------------------------------------- |
| Password Hashing       | bcrypt with cost factor 12                                     |
| JWT Access Token       | 15-minute expiry, signed with RS256 or HS256 secret            |
| JWT Refresh Token      | 7-day expiry, stored as SHA-256 hash in database               |
| Token Rotation         | New refresh token issued on each refresh; old one revoked      |
| Brute Force Protection | Rate limit login attempts: 5 attempts per 15 minutes per IP    |
| Password Reset         | Time-limited tokens (1 hour), single-use, invalidate after use |

### 14.2 API Security

| Measure            | Implementation                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- |
| HTTPS              | Enforce TLS in production; redirect HTTP to HTTPS                                                                 |
| CORS               | Whitelist only the frontend origin                                                                                |
| Rate Limiting      | Global: 100 req/min per IP; Auth endpoints: 10 req/min per IP                                                     |
| Request Size       | Limit body size to 1 MB (except file upload endpoints: 10 MB)                                                     |
| Helmet             | Use `helmet` middleware for HTTP security headers                                                                 |
| Input Sanitization | Sanitize HTML content in diary entries to prevent XSS (use DOMPurify or similar)                                  |
| SQL Injection      | Mitigated via Prisma ORM parameterized queries                                                                    |
| CSRF               | Not applicable for pure JWT-based API (no cookies); if cookies are used for refresh tokens, implement CSRF tokens |

### 14.3 Data Security

| Measure            | Implementation                                                                     |
| ------------------ | ---------------------------------------------------------------------------------- |
| Sensitive Data     | Never log passwords, tokens, or PII                                                |
| File Upload        | Validate MIME types server-side (not just client-side), scan for malware in future |
| Database           | Use least-privilege database user; separate read/write users if needed             |
| Secrets Management | Store secrets in environment variables, never in code                              |
| Audit Trail        | Log all authentication events, role changes, and data deletions                    |

### 14.4 Authorization Security

| Measure                | Implementation                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------- |
| RBAC Middleware        | Centralized role-checking middleware applied to all protected routes               |
| Resource-Level Auth    | Verify the requesting user has access to the specific resource (not just the role) |
| Visibility Enforcement | Diary entry visibility is enforced at the query level (WHERE clauses)              |
| ID Enumeration         | Use UUIDs to prevent sequential ID guessing                                        |

---

## 15. Suggested Folder Structure

```
onboarding-diary/
├── README.md
├── docs/
│   └── REQUIREMENTS.md          # This document
│
├── client/                       # Frontend (React + Vite + TypeScript)
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── main.tsx              # Entry point
│       ├── App.tsx               # Root component with routing
│       ├── vite-env.d.ts
│       ├── api/                  # API client and interceptors
│       │   ├── client.ts         # Axios instance with interceptors
│       │   ├── auth.api.ts
│       │   ├── diary.api.ts
│       │   ├── program.api.ts
│       │   ├── milestone.api.ts
│       │   ├── comment.api.ts
│       │   ├── user.api.ts
│       │   ├── notification.api.ts
│       │   └── report.api.ts
│       ├── components/           # Shared/reusable components
│       │   ├── ui/               # Primitive UI components
│       │   │   ├── Button.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Select.tsx
│       │   │   ├── Modal.tsx
│       │   │   ├── Toast.tsx
│       │   │   ├── Pagination.tsx
│       │   │   ├── LoadingSkeleton.tsx
│       │   │   └── EmptyState.tsx
│       │   ├── layout/           # Layout components
│       │   │   ├── Navbar.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Breadcrumbs.tsx
│       │   │   └── PageLayout.tsx
│       │   ├── diary/            # Diary-specific components
│       │   │   ├── DiaryCard.tsx
│       │   │   ├── DiaryForm.tsx
│       │   │   ├── MoodSelector.tsx
│       │   │   ├── TagInput.tsx
│       │   │   └── VisibilitySelect.tsx
│       │   ├── milestone/        # Milestone components
│       │   │   ├── MilestoneCard.tsx
│       │   │   ├── ProgressBar.tsx
│       │   │   └── MilestoneTimeline.tsx
│       │   ├── comment/
│       │   │   ├── CommentList.tsx
│       │   │   └── CommentForm.tsx
│       │   └── charts/           # Data visualization
│       │       ├── MoodTrendChart.tsx
│       │       └── CompletionChart.tsx
│       ├── pages/                # Page-level components (mapped to routes)
│       │   ├── auth/
│       │   │   ├── LoginPage.tsx
│       │   │   ├── RegisterPage.tsx
│       │   │   ├── ForgotPasswordPage.tsx
│       │   │   └── ResetPasswordPage.tsx
│       │   ├── recruit/
│       │   │   ├── DashboardPage.tsx
│       │   │   ├── DiaryFeedPage.tsx
│       │   │   ├── NewEntryPage.tsx
│       │   │   ├── EditEntryPage.tsx
│       │   │   ├── EntryDetailPage.tsx
│       │   │   └── MilestonesPage.tsx
│       │   ├── mentor/
│       │   │   ├── MentorDashboardPage.tsx
│       │   │   └── MenteeDetailPage.tsx
│       │   ├── manager/
│       │   │   ├── TeamDashboardPage.tsx
│       │   │   └── TeamMemberDetailPage.tsx
│       │   ├── admin/
│       │   │   ├── AdminDashboardPage.tsx
│       │   │   ├── ProgramsListPage.tsx
│       │   │   ├── ProgramDetailPage.tsx
│       │   │   ├── CreateProgramPage.tsx
│       │   │   ├── EditProgramPage.tsx
│       │   │   ├── UserManagementPage.tsx
│       │   │   ├── UserDetailPage.tsx
│       │   │   ├── InviteUserPage.tsx
│       │   │   └── ReportsPage.tsx
│       │   ├── system/
│       │   │   ├── SettingsPage.tsx
│       │   │   └── AuditLogsPage.tsx
│       │   ├── shared/
│       │   │   ├── ProfilePage.tsx
│       │   │   ├── NotificationsPage.tsx
│       │   │   └── NotFoundPage.tsx
│       │   └── ErrorPage.tsx
│       ├── hooks/                # Custom React hooks
│       │   ├── useAuth.ts
│       │   ├── useDiaryEntries.ts
│       │   ├── useMilestones.ts
│       │   ├── useNotifications.ts
│       │   ├── usePagination.ts
│       │   └── useDebounce.ts
│       ├── context/              # React Context providers
│       │   ├── AuthContext.tsx
│       │   └── NotificationContext.tsx
│       ├── guards/               # Route protection
│       │   ├── AuthGuard.tsx
│       │   └── RoleGuard.tsx
│       ├── types/                # TypeScript type definitions
│       │   ├── auth.types.ts
│       │   ├── diary.types.ts
│       │   ├── user.types.ts
│       │   ├── program.types.ts
│       │   ├── milestone.types.ts
│       │   ├── comment.types.ts
│       │   ├── notification.types.ts
│       │   ├── report.types.ts
│       │   └── api.types.ts      # Shared API response types
│       ├── utils/                # Utility functions
│       │   ├── date.ts
│       │   ├── validation.ts
│       │   └── format.ts
│       ├── constants/            # App constants
│       │   └── index.ts
│       └── styles/
│           └── globals.css       # Tailwind directives and global styles
│
├── server/                       # Backend (Node.js + Express + TypeScript)
│   ├── package.json
│   ├── tsconfig.json
│   ├── nodemon.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma         # Prisma schema definition
│   │   ├── migrations/           # Prisma migration files
│   │   └── seed.ts               # Database seed script
│   └── src/
│       ├── index.ts              # Server entry point
│       ├── app.ts                # Express app configuration
│       ├── config/               # Configuration
│       │   ├── index.ts          # Environment variable loading
│       │   ├── database.ts       # Prisma client singleton
│       │   └── cors.ts           # CORS configuration
│       ├── middleware/           # Express middleware
│       │   ├── auth.middleware.ts         # JWT verification
│       │   ├── rbac.middleware.ts         # Role-based access control
│       │   ├── validation.middleware.ts   # Request validation (Zod)
│       │   ├── error.middleware.ts        # Global error handler
│       │   ├── rateLimiter.middleware.ts  # Rate limiting
│       │   └── logger.middleware.ts       # Request logging
│       ├── modules/              # Feature modules
│       │   ├── auth/
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── auth.routes.ts
│       │   │   ├── auth.schema.ts        # Zod validation schemas
│       │   │   └── auth.types.ts
│       │   ├── user/
│       │   │   ├── user.controller.ts
│       │   │   ├── user.service.ts
│       │   │   ├── user.routes.ts
│       │   │   ├── user.schema.ts
│       │   │   └── user.types.ts
│       │   ├── diary/
│       │   │   ├── diary.controller.ts
│       │   │   ├── diary.service.ts
│       │   │   ├── diary.routes.ts
│       │   │   ├── diary.schema.ts
│       │   │   └── diary.types.ts
│       │   ├── comment/
│       │   │   ├── comment.controller.ts
│       │   │   ├── comment.service.ts
│       │   │   ├── comment.routes.ts
│       │   │   ├── comment.schema.ts
│       │   │   └── comment.types.ts
│       │   ├── program/
│       │   │   ├── program.controller.ts
│       │   │   ├── program.service.ts
│       │   │   ├── program.routes.ts
│       │   │   ├── program.schema.ts
│       │   │   └── program.types.ts
│       │   ├── milestone/
│       │   │   ├── milestone.controller.ts
│       │   │   ├── milestone.service.ts
│       │   │   ├── milestone.routes.ts
│       │   │   ├── milestone.schema.ts
│       │   │   └── milestone.types.ts
│       │   ├── notification/
│       │   │   ├── notification.controller.ts
│       │   │   ├── notification.service.ts
│       │   │   ├── notification.routes.ts
│       │   │   └── notification.types.ts
│       │   └── report/
│       │       ├── report.controller.ts
│       │       ├── report.service.ts
│       │       ├── report.routes.ts
│       │       └── report.types.ts
│       ├── errors/               # Custom error classes
│       │   ├── AppError.ts
│       │   ├── NotFoundError.ts
│       │   ├── ForbiddenError.ts
│       │   ├── UnauthorizedError.ts
│       │   ├── ValidationError.ts
│       │   └── ConflictError.ts
│       ├── utils/                # Utility functions
│       │   ├── jwt.ts            # Token generation/verification
│       │   ├── hash.ts           # Password hashing
│       │   ├── pagination.ts     # Pagination helper
│       │   ├── csv.ts            # CSV export helper
│       │   └── sanitize.ts       # HTML sanitization
│       └── types/                # Shared TypeScript types
│           ├── express.d.ts      # Express type augmentation
│           └── index.ts
│
├── shared/                       # Shared code between client and server
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── enums.ts              # Shared enums (Role, Visibility, etc.)
│       ├── validation.ts         # Shared Zod schemas
│       └── constants.ts          # Shared constants
│
├── .gitignore
├── .env.example
├── docker-compose.yml            # PostgreSQL + app services
├── Dockerfile                    # Multi-stage build
└── package.json                  # Root package.json (workspace config)
```

---

## 16. Suggested Architecture

### 16.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Client (Browser)                 │
│          React + Vite + TypeScript + Tailwind        │
│                                                      │
│  ┌─────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Pages   │  │Components│  │  Context/Hooks     │  │
│  └────┬────┘  └────┬─────┘  └────────┬──────────┘  │
│       └─────────┬──┘                 │              │
│                 ▼                     │              │
│         ┌──────────────┐             │              │
│         │  API Client  │◄────────────┘              │
│         └──────┬───────┘                            │
└────────────────┼────────────────────────────────────┘
                 │ HTTPS (REST API)
                 ▼
┌────────────────────────────────────────────────────┐
│                  Server (Node.js)                   │
│           Express + TypeScript + Prisma             │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │              Middleware Pipeline               │  │
│  │  Logger → RateLimiter → Auth → RBAC → Valid.  │  │
│  └──────────────────────┬───────────────────────┘  │
│                         ▼                           │
│  ┌──────────────────────────────────────────────┐  │
│  │                  Routes                        │  │
│  │  /auth  /users  /diary  /programs  /reports   │  │
│  └──────────────────────┬───────────────────────┘  │
│                         ▼                           │
│  ┌──────────────────────────────────────────────┐  │
│  │               Controllers                      │  │
│  │  Parse request → Call service → Send response  │  │
│  └──────────────────────┬───────────────────────┘  │
│                         ▼                           │
│  ┌──────────────────────────────────────────────┐  │
│  │                Services                        │  │
│  │  Business logic → Data access → Validation     │  │
│  └──────────────────────┬───────────────────────┘  │
│                         ▼                           │
│  ┌──────────────────────────────────────────────┐  │
│  │            Prisma ORM Client                   │  │
│  └──────────────────────┬───────────────────────┘  │
└─────────────────────────┼──────────────────────────┘
                          │
                          ▼
                 ┌────────────────┐
                 │   PostgreSQL   │
                 │   Database     │
                 └────────────────┘
```

### 16.2 Backend Architecture Pattern

The backend follows a **Layered Architecture** with **Modular Organization**:

| Layer             | Responsibility                                                        |
| ----------------- | --------------------------------------------------------------------- |
| **Routes**        | Define HTTP endpoints, apply middleware (auth, validation, RBAC)      |
| **Controllers**   | Parse HTTP requests, call services, format HTTP responses             |
| **Services**      | Business logic, authorization checks, data orchestration              |
| **Prisma Client** | Data access, query building, transaction management                   |
| **Middleware**    | Cross-cutting concerns (auth, logging, error handling, rate limiting) |

**Key Principles:**

- Controllers do NOT contain business logic
- Services do NOT know about HTTP (no `req`/`res` objects)
- Each module is self-contained with its own routes, controller, service, schemas, and types
- Shared utilities are in the `utils/` directory
- Custom errors are thrown by services and caught by the global error handler

### 16.3 Frontend Architecture Pattern

The frontend follows a **Feature-Based Organization** with **Context-driven State**:

| Layer          | Responsibility                                             |
| -------------- | ---------------------------------------------------------- |
| **Pages**      | Route-level components, data fetching orchestration        |
| **Components** | Reusable UI elements, presentation logic                   |
| **Hooks**      | Custom hooks for data fetching, side effects, shared logic |
| **Context**    | Global state (auth, notifications)                         |
| **API Client** | HTTP requests, response transformation, error handling     |
| **Guards**     | Route protection based on auth state and roles             |

---

## 17. State Management Approach

### 17.1 Strategy Overview

The application uses a **lightweight, Context-based approach** without heavy state management libraries. This is appropriate because:

- The app is primarily CRUD-oriented with limited cross-component state sharing
- Server state (diary entries, milestones, etc.) is best managed with a data-fetching library
- Only auth and notifications require true global state

### 17.2 State Categories

| Category               | Solution                     | Scope                                               |
| ---------------------- | ---------------------------- | --------------------------------------------------- |
| **Server State**       | React Query (TanStack Query) | Caching, refetching, pagination, optimistic updates |
| **Auth State**         | React Context + useReducer   | Global (user session, tokens, role)                 |
| **Notification State** | React Context                | Global (unread count, notification list)            |
| **UI State**           | Component-level useState     | Local (modals, form state, toggles)                 |
| **Form State**         | React Hook Form + Zod        | Local per form (validation, dirty tracking)         |
| **URL State**          | React Router (searchParams)  | Filters, pagination, sort order                     |

### 17.3 React Query Configuration

```
- Stale time: 5 minutes (diary entries, milestones)
- Cache time: 30 minutes
- Refetch on window focus: enabled
- Retry: 3 times with exponential backoff
- Pagination: usePaginatedQuery for list endpoints
- Mutations: optimistic updates for comments, milestone completions
- Invalidation: targeted cache invalidation after mutations
```

### 17.4 Auth State Flow

```
1. On app load:
   ├─ Check localStorage for refresh token
   ├─ If exists: call /auth/refresh to get new access token
   │   ├─ Success: set user in AuthContext, proceed to app
   │   └─ Failure: clear tokens, redirect to /login
   └─ If not exists: redirect to /login

2. On API call:
   ├─ Attach access token from AuthContext to Authorization header
   ├─ If 401 response: attempt token refresh
   │   ├─ Success: retry original request
   │   └─ Failure: logout user, redirect to /login
   └─ Proceed normally

3. On logout:
   ├─ Call /auth/logout (revoke refresh token)
   ├─ Clear AuthContext
   ├─ Clear localStorage
   └─ Redirect to /login
```

---

## 18. Reporting Generation Strategy

### 18.1 Report Types

| Report                  | Description                                                   | Audience                  | Format          |
| ----------------------- | ------------------------------------------------------------- | ------------------------- | --------------- |
| **Program Completion**  | Milestone completion rates per program                        | HR Admin                  | Dashboard + CSV |
| **Individual Progress** | A recruit's diary entries, milestones, and mood trends        | Mentor, Manager, HR Admin | Dashboard       |
| **Mood Analytics**      | Mood trends over time (per recruit, team, or org-wide)        | Manager, HR Admin         | Dashboard + CSV |
| **Cohort Comparison**   | Compare onboarding outcomes across different cohorts/programs | HR Admin                  | Dashboard + CSV |
| **Activity Summary**    | Diary entry frequency and engagement metrics                  | HR Admin                  | Dashboard       |

### 18.2 Implementation Strategy

**Phase 1 (MVP):** Server-side aggregation with SQL queries via Prisma `$queryRaw` for complex aggregations.

- Dashboard charts are computed on-demand by the backend
- Aggregate queries use PostgreSQL window functions, GROUP BY, and date_trunc
- Results are cached in React Query with a 5-minute stale time
- CSV export is generated server-side and streamed as a download

**Phase 2 (Future):** Pre-computed materialized views or summary tables for frequently accessed reports.

### 18.3 CSV Export Approach

- The backend generates CSV using a streaming approach (node `stream.Transform`) to handle large datasets
- Response uses `Content-Type: text/csv` and `Content-Disposition: attachment; filename="report-YYYY-MM-DD.csv"`
- Frontend triggers download via a Blob URL
- The export includes a header row and is formatted for easy import into spreadsheet tools

### 18.4 Dashboard Components

| Chart Type   | Library           | Use Case                                 |
| ------------ | ----------------- | ---------------------------------------- |
| Line Chart   | Recharts          | Mood trends over time                    |
| Bar Chart    | Recharts          | Milestone completion by category         |
| Doughnut/Pie | Recharts          | Program enrollment distribution          |
| Progress Bar | Custom (Tailwind) | Individual milestone progress            |
| Data Table   | Custom (Tailwind) | Recruit lists with sorting and filtering |

---

## 19. Future Extensibility Ideas

### 19.1 Short-Term Enhancements (v1.1 - v1.3)

| Feature                 | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| **Email Notifications** | Send email digests for comments, milestone reminders                  |
| **Rich Text Editor**    | Integrate Tiptap or Quill for a better diary writing experience       |
| **Dark Mode**           | Tailwind dark mode support with user preference persistence           |
| **Activity Feed**       | A feed showing recent activity across mentees (for mentors)           |
| **Bulk Operations**     | HR Admin can bulk-enroll recruits, bulk-assign mentors                |
| **Program Templates**   | Pre-built templates for common departments (Engineering, Sales, etc.) |

### 19.2 Medium-Term Enhancements (v2.0)

| Feature                     | Description                                                               |
| --------------------------- | ------------------------------------------------------------------------- |
| **SSO Integration**         | Support SAML/OIDC for enterprise single sign-on                           |
| **Real-time Updates**       | WebSocket support for live comments and notifications                     |
| **Mobile App**              | React Native companion app for diary entries on the go                    |
| **File Storage**            | AWS S3/GCS integration for attachment storage                             |
| **Advanced Search**         | Elasticsearch integration for full-text search with highlighting          |
| **Customizable Milestones** | Let managers create team-specific milestones on top of program milestones |
| **Goal Setting**            | Recruits can set personal goals linked to milestones                      |

### 19.3 Long-Term Vision (v3.0+)

| Feature                  | Description                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| **AI-Powered Insights**  | Sentiment analysis on diary entries, AI-generated summaries for managers |
| **Onboarding Score**     | Composite score based on milestone completion, mood, entry frequency     |
| **Peer Feedback**        | Allow team members (not just mentors) to provide feedback                |
| **Gamification**         | Badges, streaks, and leaderboards to encourage daily journaling          |
| **Integration Hub**      | Connect with HRIS (BambooHR, Workday), Slack, MS Teams                   |
| **Multi-Tenant**         | Support multiple organizations with data isolation                       |
| **Audit Compliance**     | Full audit trail with data export for compliance (GDPR, SOC 2)           |
| **Localization**         | Full i18n support for multiple languages                                 |
| **Analytics Dashboard**  | Advanced BI-style dashboards with custom report builder                  |
| **Onboarding Playbooks** | Step-by-step interactive guides within the app                           |

### 19.4 Architecture Extensibility Points

| Area          | Current              | Future-Ready For                                  |
| ------------- | -------------------- | ------------------------------------------------- |
| Auth          | JWT                  | SSO/OIDC provider integration                     |
| Storage       | Local filesystem     | S3-compatible object storage                      |
| Search        | PostgreSQL full-text | Elasticsearch/Typesense                           |
| Notifications | In-app only          | Email (SendGrid), Slack, push notifications       |
| API           | REST                 | GraphQL layer, webhook events                     |
| Deployment    | Docker Compose       | Kubernetes, serverless functions                  |
| Database      | Single PostgreSQL    | Read replicas, connection pooling (PgBouncer)     |
| Caching       | React Query (client) | Redis server-side cache                           |
| Monitoring    | Structured logging   | APM (Datadog, New Relic), error tracking (Sentry) |
| CI/CD         | Manual               | GitHub Actions pipeline with automated testing    |

---

## Appendix A: Enum Summary

```typescript
enum Role {
  RECRUIT = 'RECRUIT',
  MENTOR = 'MENTOR',
  MANAGER = 'MANAGER',
  HR_ADMIN = 'HR_ADMIN',
  SYS_ADMIN = 'SYS_ADMIN',
}

enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  INVITED = 'INVITED',
}

enum Visibility {
  PRIVATE = 'PRIVATE',
  MENTOR_ONLY = 'MENTOR_ONLY',
  TEAM = 'TEAM',
  PUBLIC = 'PUBLIC',
}

enum MilestoneCategory {
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  TECHNICAL = 'TECHNICAL',
  SOCIAL = 'SOCIAL',
  LEARNING = 'LEARNING',
  DELIVERABLE = 'DELIVERABLE',
}

enum EnrollmentStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  WITHDRAWN = 'WITHDRAWN',
}

enum CompletionStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

enum NotificationType {
  COMMENT_ADDED = 'COMMENT_ADDED',
  MILESTONE_REMINDER = 'MILESTONE_REMINDER',
  MILESTONE_VERIFIED = 'MILESTONE_VERIFIED',
  MILESTONE_REJECTED = 'MILESTONE_REJECTED',
  MENTOR_ASSIGNED = 'MENTOR_ASSIGNED',
  PROGRAM_ENROLLED = 'PROGRAM_ENROLLED',
}
```

## Appendix B: Environment Variables

```bash
# Server
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/onboarding_diary

# JWT
JWT_ACCESS_SECRET=your-access-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Email (future)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=noreply@company.com
# SMTP_PASS=your-smtp-password

# Logging
LOG_LEVEL=info
```
