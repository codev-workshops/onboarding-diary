# Frontend

React + TypeScript + Vite single-page app for the Onboarding Diary. See the root
[README](../README.md) and [AGENTS.md](../AGENTS.md) for project-wide conventions, and
[ADR-005](../docs/adr/ADR-005-frontend-dependency-set.md) for the approved package set.

```bash
npm ci
npm run dev           # http://localhost:5173, proxies /api to the API on :5276
npm run lint          # eslint
npm run format        # prettier --write   (format:check in CI)
npm run test          # vitest + React Testing Library
npm run build         # tsc -b && vite build
```

Layout: `api/` (fetch wrapper, DTOs, TanStack Query hooks), `auth/`, `components/` (shared),
`features/<feature>/` mirroring the backend feature names, `test/` (Vitest setup).
