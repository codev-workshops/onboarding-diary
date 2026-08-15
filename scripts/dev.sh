#!/usr/bin/env bash
# Runs the API and the Vite dev server together; Ctrl+C stops both.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  jobs -p | xargs -r kill 2>/dev/null || true
}
trap cleanup EXIT

(cd "$root/backend/OnboardingDiary.Api" && dotnet run) &
(cd "$root/frontend" && npm run dev) &

wait
