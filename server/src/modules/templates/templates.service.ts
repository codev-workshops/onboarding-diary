import { z } from 'zod';
import type { Db } from '../../db/prisma.js';
import { ApiError } from '../../http/errors.js';
import { TASK_PRIORITIES } from '../../domain/enums.js';

const itemSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).default(''),
  priority: z.enum(TASK_PRIORITIES),
  dueOffsetDays: z.number().int().min(0).max(365).default(0),
  categoryId: z.string().nullable().optional(),
});

export const templateCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).default(''),
  role: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  items: z.array(itemSchema).default([]),
});

export const templateUpdateSchema = templateCreateSchema.partial();

export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;

const templateInclude = {
  items: { orderBy: { order: 'asc' } },
  department: { select: { id: true, name: true } },
} as const;

export function listTemplates(db: Db) {
  return db.checklistTemplate.findMany({ orderBy: { name: 'asc' }, include: templateInclude });
}

export async function getTemplate(db: Db, id: string) {
  const template = await db.checklistTemplate.findUnique({ where: { id }, include: templateInclude });
  if (!template) throw ApiError.notFound('Template not found');
  return template;
}

async function assertDepartmentValid(db: Db, departmentId: string | null | undefined) {
  if (!departmentId) return;
  const dept = await db.department.findUnique({ where: { id: departmentId } });
  if (!dept) throw ApiError.badRequest('Assigned department does not exist');
}

/** Builds the ordered `items` create payload from validated input items. */
function itemsCreate(items: TemplateCreateInput['items']) {
  return items.map((item, index) => ({
    title: item.title,
    description: item.description,
    priority: item.priority,
    dueOffsetDays: item.dueOffsetDays,
    categoryId: item.categoryId ?? null,
    order: index,
  }));
}

export async function createTemplate(db: Db, input: TemplateCreateInput) {
  await assertDepartmentValid(db, input.departmentId);
  const existing = await db.checklistTemplate.findUnique({ where: { name: input.name } });
  if (existing) throw ApiError.conflict('A template with that name already exists');

  return db.checklistTemplate.create({
    data: {
      name: input.name,
      description: input.description,
      role: input.role ?? null,
      departmentId: input.departmentId ?? null,
      items: { create: itemsCreate(input.items) },
    },
    include: templateInclude,
  });
}

export async function updateTemplate(db: Db, id: string, input: TemplateUpdateInput) {
  await getTemplate(db, id);
  if (input.departmentId !== undefined) await assertDepartmentValid(db, input.departmentId);
  if (input.name) {
    const dup = await db.checklistTemplate.findUnique({ where: { name: input.name } });
    if (dup && dup.id !== id) throw ApiError.conflict('A template with that name already exists');
  }

  // When items are supplied, replace the set wholesale (simplest consistent edit).
  if (input.items !== undefined) {
    await db.checklistItem.deleteMany({ where: { templateId: id } });
  }

  return db.checklistTemplate.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      role: input.role,
      departmentId: input.departmentId,
      ...(input.items !== undefined ? { items: { create: itemsCreate(input.items) } } : {}),
    },
    include: templateInclude,
  });
}

export async function deleteTemplate(db: Db, id: string): Promise<void> {
  await getTemplate(db, id);
  await db.checklistTemplate.delete({ where: { id } });
}

/** Adds `days` to a date, returning a new UTC date (day-granularity semantics). */
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Applies a template to a user, seeding one Task per template item into the
 * user's Task Log (docs/ASSUMPTIONS.md §17). Each seeded task starts as "To Do"
 * with `dueDate = user.startDate + item.dueOffsetDays`. Items without an explicit
 * category fall back to the first active task category.
 *
 * Returns the number of tasks created.
 */
export async function applyTemplateToUser(
  db: Db,
  templateId: string,
  userId: string,
): Promise<number> {
  const template = await getTemplate(db, templateId);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');
  if (template.items.length === 0) return 0;

  const fallbackCategory = await db.taskCategory.findFirst({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  const now = new Date();
  const data = template.items.map((item) => {
    const categoryId = item.categoryId ?? fallbackCategory?.id;
    if (!categoryId) {
      throw ApiError.badRequest('No task category available to seed template tasks');
    }
    return {
      ownerId: userId,
      date: now,
      title: item.title,
      description: item.description,
      status: 'To Do',
      priority: item.priority,
      categoryId,
      dueDate: addDays(user.startDate, item.dueOffsetDays),
    };
  });

  await db.task.createMany({ data });
  return data.length;
}
