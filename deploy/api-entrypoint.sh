#!/bin/sh
# Apply pending migrations, then serve (T-194). `migrate deploy` is idempotent and never
# generates or resets, so it is safe to run on every boot; a failure aborts the start so a
# half-migrated schema is never served.
set -eu

cd /app/apps/api
echo "Applying database migrations"
npx prisma migrate deploy

cd /app
exec node apps/api/dist/server.js
