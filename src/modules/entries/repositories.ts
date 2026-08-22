import { createScopedRepository } from '@/src/modules/entries/base-repository';
import { prisma } from '@/src/shared/db/prisma';

/**
 * One scoped repository per entry table. The CRUD services and route handlers
 * arrive in M4–M6 and build on these; read paths are already closed.
 */
export const taskRepository = createScopedRepository('TASK', prisma.taskEntry);
export const issueRepository = createScopedRepository('ISSUE', prisma.issueEntry);
export const feedbackRepository = createScopedRepository('FEEDBACK', prisma.feedbackEntry);
export const noteRepository = createScopedRepository('NOTE', prisma.noteEntry);
