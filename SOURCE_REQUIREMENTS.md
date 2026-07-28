# Source Requirements (Immutable Input)

> **This file is the immutable "source of truth" input for the project.** The text below is the
> original minimal requirements as provided. It must not be edited, reworded, or extended.
> All elaboration, interpretation, and design decisions live in
> [`REQUIREMENTS.md`](./REQUIREMENTS.md); anything not stated below is an elaboration and belongs
> there (under "Open Questions / Assumptions" if it is an addition to scope).

---

## Diary Application - Requirements

### Overview

A web application for new recruits to document their onboarding journey. Recruits log the tasks
they work on, the issues they run into, feedback they want to share, and any additional notes,
and can view a dashboard and generate reports of their onboarding progress.

### User Roles

- **New Recruit** - documents their own onboarding journey.
- **Manager** - oversees recruits and reports on the recruits they oversee.
- **Admin** - manages users and has visibility of all data.

### Features

#### Authentication

- Email/password authentication.
- User profile: name, role, department, start date.

#### Task Log

- Fields: date, title, description, category, status, priority.
- Create, read, update, delete.
- Filter by date, category, and status.

#### Issue Log

- Fields: date, title, description, severity, status, resolution notes.
- Create, read, update, delete.
- Filter by status and severity.

#### Feedback Notes

- Fields: date, subject, type (Positive / Suggestion / Concern), details.

#### Additional Notes

- Fields: date, title, content, tags.
- Create, read, update, delete.

#### Dashboard

- Summary counts, recent entries, task completion progress, open issues.

#### Reports

- Reports by date range, exportable as PDF or CSV.
- Managers can report on the recruits they oversee.

### Technical Notes

- Responsive web application.
- Database persistence.
- Preferred stack: Java 17, Spring Boot 3.2, Spring Data JPA, Maven, PostgreSQL.
