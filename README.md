# Onboarding Diary

A web application for new recruits to document their onboarding journey. Users log daily tasks, record issues, provide feedback, and capture notes. Managers can view entries and generate downloadable reports.

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, React Query, React Router, Recharts
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Auth**: JWT (access + refresh tokens), bcrypt
- **Validation**: Zod (shared frontend + backend)

## Project Structure

```
onboarding-diary/
├── client/          # React frontend (Vite)
├── server/          # Express backend
│   └── prisma/      # Database schema
└── shared/          # Shared types & validation schemas
```

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
# Install dependencies
npm install

# Build shared types
npm run build -w shared

# Set up environment
cp server/.env.example server/.env
# Edit server/.env with your database URL

# Generate Prisma client and push schema
cd server
npx prisma generate
npx prisma db push
cd ..
```

### Development

```bash
# Run both frontend and backend
npm run dev

# Or run separately:
npm run dev -w server   # Backend on port 3001
npm run dev -w client   # Frontend on port 5173
```

### Type Checking

```bash
npm run typecheck
```

## User Roles

- **Recruit** - Logs tasks, issues, feedback, and notes
- **Manager** - Views recruit entries and generates reports
- **Admin** - Manages users and views all data

## Features

- Task logging with categories, status, and priority
- Issue tracking with severity and resolution notes
- Feedback submission (Positive / Suggestion / Concern)
- Free-form notes with tags
- Dashboard with summary cards and charts
- Report generation with PDF/CSV download
- Admin user management
