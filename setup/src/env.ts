/**
 * The setup tool is only valid in demo mode — i.e. when no production database is
 * configured in its own environment. Because it is a separate process, it checks
 * the same single signal the server uses: the presence of `DB_STRING`
 * (docs/ASSUMPTIONS.md §13). If `DB_STRING` is set, the environment is already in
 * production and provisioning must be refused. The target Postgres string for a
 * cutover is supplied in the request body, never via this env var.
 */
export function isDemoEnvironment(): boolean {
  return !(process.env.DB_STRING && process.env.DB_STRING.trim());
}
