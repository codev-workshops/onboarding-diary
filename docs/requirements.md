# Onboarding Diary Application — Requirements

Markdown transcription of `Onboarding_Diary_App_Requirements.pdf` (kept alongside
as the source of record).

## Overview

A web application for new recruits to document their onboarding journey. Users
log daily tasks, record issues, provide feedback, and capture notes. Managers can
view entries and generate downloadable reports.

## User Roles

| Role        | Capabilities                                     |
|-------------|--------------------------------------------------|
| New Recruit | Logs tasks, issues, feedback, and notes          |
| Manager     | Views recruit entries and generates reports      |
| Admin       | Manages users and views all data                 |

## Features

### Authentication

- Sign up / login with email and password
- User profile (name, role, department, start date); users edit only their name — role, department and start date are assigned by an Admin
- Users only see the navigation and content their role permits

### Task Log

- Create, edit, and delete task entries
- Fields: date, title, description, category, status, priority
- Filter by date, category, or status

### Issue Log

- Log issues or blockers encountered
- Fields: date, title, description, severity, status, resolution notes
- Filter by status or severity

### Feedback Notes

- Submit feedback about the onboarding process
- Fields: date, subject, type (Positive / Suggestion / Concern), details

### Additional Notes

- Free-form notes section with date, title, content, and tags

### Dashboard

- Summary counts and recent entries across all categories
- Task completion progress and open issues at a glance

### Reports

- Generate reports by date range (tasks, issues, feedback, or combined)
- Download as PDF or CSV
- Managers can generate reports for recruits they oversee

## Technical Notes

- Web application (responsive)
- Tech stack is candidate's choice
- Data should be persisted in a database

## Exercise Instructions

This is a greenfield project. There is no existing codebase.

1. **Elaborate the Requirements** — Use Devin to expand this document into
   detailed requirements: add user stories, define API endpoints, describe UI
   flows, specify validation rules, and suggest any additional features that
   would improve the app.
2. **Build the Application** — Work with Devin to build the application
   incrementally using the elaborated requirements.
3. **Extend** — Once the core app is working, collaborate with Devin to add at
   least two new features of your choice (e.g., search, charts, manager
   dashboards, onboarding checklists).
