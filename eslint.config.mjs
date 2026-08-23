import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
  {
    // Module boundary. Route handlers, pages and components resolve the actor
    // and call a service; the moment one of them can reach a Prisma delegate,
    // the scope predicate in the repository becomes optional rather than
    // structural. Services keep their database access — the rule is about who
    // may query entry tables, not about hiding the ORM.
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'middleware.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@prisma/client',
              importNames: ['PrismaClient'],
              message:
                'Route handlers must not construct a Prisma client. Call a service in src/modules/*; enum and type imports are fine.',
            },
            {
              name: '@/src/shared/db/prisma',
              message:
                'Route handlers must not query the database directly — an entry table queried outside src/modules/entries/repositories.ts has no owner_id scope predicate. Call a service instead.',
            },
          ],
        },
      ],
    },
  },
  {
    // Same rule one level in: only the repository module may hold an entry
    // delegate, so a future service cannot quietly bypass the scoped wrapper.
    files: ['src/modules/**/*.ts'],
    ignores: [
      'src/modules/entries/repositories.ts',
      'src/modules/entries/base-repository.ts',
      'src/modules/audit/service.ts',
      // The audit table is not entry data: it holds the record of who acted, and
      // reading it is admin-only rather than owner-scoped.
      'src/modules/audit/query-service.ts',
      // Report-run metadata is not entry data — parameters only, no titles or
      // bodies — so it is written directly rather than through a repository.
      'src/modules/reports/runs.ts',
      'src/modules/auth/**',
      'src/modules/users/**',
      'src/modules/departments/**',
      'src/modules/health/**',
      'src/modules/authz/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/src/shared/db/prisma',
              message:
                'Entry data must go through the scoped repositories in src/modules/entries/repositories.ts.',
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
