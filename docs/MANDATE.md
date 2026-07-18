# Onboarding Diary — Requirements Mandate

> **Authoritative source of requirements.** This document is the single source of
> truth for the Onboarding Diary application going forward. The original
> `README.md` project description is deprecated and should be ignored where it
> conflicts with this mandate.

## Overview

The Onboarding Diary is a responsive web application that helps new employees
("recruits") document and track their progress during the company onboarding
process. Recruits record tasks, issues, feedback, and general notes throughout
their onboarding journey. Managers oversee the recruits they are responsible for,
and administrators manage the system as a whole. The application provides a
dashboard for at-a-glance status and supports exporting reports over a chosen
date range.

## User Roles

- **New Recruit** — The primary user. Documents their own onboarding journey by
  logging tasks, issues, feedback, and notes, and views their personal dashboard
  and reports.
- **Manager** — Oversees a set of recruits. Can report on the recruits they
  oversee.
- **Admin** — Administers the system and its users.

## Features

### Authentication

- Email/password authentication.
- User profile including **name**, **role**, **department**, and **start date**.

### Task Log

- Fields: **date**, **title**, **description**, **category**, **status**,
  **priority**.
- Full **CRUD** (create, read, update, delete).
- **Filter** by date, category, and status.

### Issue Log

- Fields: **date**, **title**, **description**, **severity**, **status**,
  **resolution notes**.
- **Filter** by status and severity.

### Feedback Notes

- Fields: **date**, **subject**, **type** (**Positive** | **Suggestion** |
  **Concern**), **details**.

### Additional Notes

- Fields: **date**, **title**, **content**, **tags**.

### Dashboard

- Summary counts.
- Recent entries.
- Task completion progress.
- Open issues.

### Reports

- Reports by **date range**.
- Exportable as **PDF** or **CSV**.
- Managers can report on the recruits they oversee.

## Technical Notes

- Responsive web application.
- Tech stack is the candidate's choice.
- Database persistence.

## Exercise Instructions

- **Step 1** — Elaborate the requirements.
- **Step 2** — Build the application incrementally.
- **Step 3** — Extend the application with two new features.

> Selected Step 3 extension features (see `ASSUMPTIONS.md` §17–§19 and `PLAN.md`):
> **(1) onboarding checklist templates**, **(2) task due dates & overdue
> reminders**, and **(3) comments with @mentions & an activity indicator**. Each
> ships with onboarding enablers and unit + e2e tests.
