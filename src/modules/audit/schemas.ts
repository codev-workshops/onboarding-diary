import { z } from 'zod';

import { entryDateSchema, paginationFields } from '@/src/modules/entries/schemas';

/**
 * §12.8 filters. Every field is optional and strictly typed: the audit list is
 * the one read that spans the whole organisation, so a query string must not be
 * able to smuggle anything into the SQL.
 */
export const auditLogQuerySchema = z
  .object({
    ...paginationFields,
    actor_user_id: z.string().uuid('Choose an actor from the list.').optional(),
    target_user_id: z.string().uuid('Choose a user from the list.').optional(),
    action: z.string().trim().min(1).max(60).optional(),
    entity_type: z.string().trim().min(1).max(40).optional(),
    date_from: entryDateSchema.optional(),
    date_to: entryDateSchema.optional(),
  })
  .strict()
  .refine(
    (query) => !query.date_from || !query.date_to || query.date_from <= query.date_to,
    'The end of the range must not precede its start.'
  );

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
