import { execSync } from 'node:child_process';

/**
 * Detects whether a working Docker daemon is available. The Postgres
 * Testcontainers suite runs on every push in CI and locally when Docker is
 * present; when Docker is genuinely absent it skips gracefully rather than
 * failing (docs/PLAN.md, docs/techstack.md).
 */
export function dockerAvailable(): boolean {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
