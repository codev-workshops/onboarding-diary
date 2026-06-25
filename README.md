# Onboarding Diary

A web application for new recruits to document their onboarding journey.

## Architecture

- **Backend**: .NET 10 Web API with clean architecture (Api, Application, Domain, Infrastructure layers)
- **Frontend**: Next.js with TypeScript and App Router

## Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js 20+](https://nodejs.org/)
- SQL Server Express (for local development)

### Backend

```bash
cd backend/OnboardingDiary.Api
dotnet run
```

The API will be available at:
- HTTP: `http://localhost:5216`
- HTTPS: `https://localhost:7030`
- Swagger UI: `https://localhost:7030/swagger` (Development mode)

The Swagger UI includes an **Authorize** button for JWT Bearer token authentication (endpoints requiring auth will be added in later phases).

#### Running Tests

```bash
cd backend
dotnet test
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Configuration

#### Backend Connection String

The backend expects a SQL Server Express instance. The default connection string in `appsettings.json`:

```
Server=localhost\SQLEXPRESS;Database=OnboardingDiary;Trusted_Connection=True;TrustServerCertificate=True;
```

Update this in `appsettings.Development.json` if your SQL Server instance differs.

#### Admin Seed Configuration

On first startup (Development mode), the application automatically applies pending migrations and seeds a default admin user. Configure via `appsettings.Development.json`:

| Key | Default | Description |
|-----|---------|-------------|
| `Seed:AdminEmail` | `admin@onboardingdiary.com` | Email for the seeded admin user |
| `Seed:AdminPassword` | `Admin@123` | Initial password (BCrypt hashed, work factor 12) |

#### Frontend API URL

Create a `.env.local` file in the `frontend/` directory (see `.env.local.example`):

```
NEXT_PUBLIC_API_BASE_URL=https://localhost:7030
```

### Database

#### Tables

The `InitialCreate` migration creates the following tables:

| Table | Description |
|-------|-------------|
| `Users` | User accounts (recruits, managers, admins) |
| `Tasks` | Onboarding tasks assigned to recruits |
| `Issues` | Issues encountered during onboarding |
| `Feedbacks` | Recruit feedback entries |
| `Notes` | Personal notes with JSON-stored tags |
| `Reports` | Generated reports with JSON-stored categories |
| `RefreshTokens` | JWT refresh tokens for authentication |
| `AuditLogs` | Audit trail for admin actions |

#### EF Core Migrations

Install the EF Core CLI tool (if not already installed):

```bash
dotnet tool install --global dotnet-ef
```

Generate a new migration:

```bash
cd backend
dotnet ef migrations add <MigrationName> \
  --project OnboardingDiary.Infrastructure \
  --startup-project OnboardingDiary.Api \
  --output-dir Persistence/Migrations
```

Apply migrations to the database:

```bash
cd backend
dotnet ef database update \
  --project OnboardingDiary.Infrastructure \
  --startup-project OnboardingDiary.Api
```

In Development mode, migrations are automatically applied on startup.

### Health Check

Verify the backend is running:

```bash
curl http://localhost:5216/api/health
# Returns: {"status":"ok"}
```

The frontend landing page displays the API connection status automatically.
