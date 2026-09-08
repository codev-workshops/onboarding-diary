#!/usr/bin/env bash
# Starts the API (http://localhost:5276) and the Vite dev server (http://localhost:5173)
# together, seeding the demo accounts listed in README §"Demo accounts". Ctrl+C stops both.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Development}"
export ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-AdminPassword!1}"
# Development-only seed: adds a manager, an assigned recruit and an unassigned recruit.
export E2E_SEED="${E2E_SEED:-true}"

if ! command -v dotnet >/dev/null 2>&1 && [ -x "$HOME/.dotnet/dotnet" ]; then
  export DOTNET_ROOT="$HOME/.dotnet"
  export PATH="$PATH:$HOME/.dotnet:$HOME/.dotnet/tools"
fi

pids=()
cleanup() {
  trap - INT TERM EXIT
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "API      http://localhost:5276"
echo "Frontend http://localhost:5173"
echo

dotnet run --project "$repo_root/backend/src/OnboardingDiary.Api" &
pids+=($!)

if [ ! -d "$repo_root/frontend/node_modules" ]; then
  (cd "$repo_root/frontend" && npm ci)
fi

(cd "$repo_root/frontend" && npm run dev) &
pids+=($!)

wait -n
