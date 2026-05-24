import type { Prisma } from '@prisma/client';
import type {
  SearchResultItem,
  SearchHighlight,
  TaskSearchMeta,
  IssueSearchMeta,
  FeedbackSearchMeta,
  NoteSearchMeta,
  SearchEntityType,
  PaginatedResponse,
  GlobalSearchParamsSchema,
} from '@onboarding-diary/shared';
import { Role } from '@onboarding-diary/shared';
import { prisma } from '../../config/database.js';

/**
 * Highlights occurrences of `query` in `text` by wrapping matches in <mark> tags.
 * Returns the snippet around the first match (context window) or the start of the text.
 */
function highlightText(text: string, query: string, maxLength = 200): string {
  if (!text || !query) return text?.slice(0, maxLength) ?? '';

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);

  if (idx === -1) return text.slice(0, maxLength);

  // Build a context window around the first match
  const contextStart = Math.max(0, idx - 60);
  const contextEnd = Math.min(text.length, idx + query.length + 140);
  let snippet = text.slice(contextStart, contextEnd);
  if (contextStart > 0) snippet = '…' + snippet;
  if (contextEnd < text.length) snippet = snippet + '…';

  // Wrap all occurrences in <mark>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return snippet.replace(regex, '<mark>$1</mark>');
}

function buildHighlights(
  fields: Array<{ name: string; value: string | null }>,
  query: string,
): SearchHighlight[] {
  const highlights: SearchHighlight[] = [];
  const lowerQuery = query.toLowerCase();

  for (const { name, value } of fields) {
    if (value && value.toLowerCase().includes(lowerQuery)) {
      highlights.push({
        field: name,
        snippet: highlightText(value, query),
      });
    }
  }

  return highlights;
}

/**
 * Build role-scoped visibility filter for tasks/issues/notes.
 * Uses a generic shape compatible with all three entity where-inputs.
 */
async function buildVisibilityScopeFilter(
  requesterId: string,
  requesterRole: Role,
): Promise<{ OR: Array<Record<string, unknown>> } | undefined> {
  if (requesterRole === Role.ADMIN) return undefined;

  if (requesterRole === Role.RECRUIT) {
    return {
      OR: [{ userId: requesterId }, { visibility: 'PUBLIC' }],
    };
  }

  // MANAGER: own + assigned recruits' non-PRIVATE + all PUBLIC
  const assignments = await prisma.managerRecruitRelationship.findMany({
    where: { managerId: requesterId, isActive: true },
    select: { recruitId: true },
  });
  const recruitIds = assignments.map((a) => a.recruitId);

  return {
    OR: [
      { userId: requesterId },
      { userId: { in: recruitIds }, visibility: { not: 'PRIVATE' } },
      { visibility: 'PUBLIC' },
    ],
  };
}

/**
 * Build role-scoped filter for feedback (no visibility field).
 */
async function buildFeedbackScopeFilter(
  requesterId: string,
  requesterRole: Role,
): Promise<Prisma.FeedbackEntryWhereInput | undefined> {
  if (requesterRole === Role.ADMIN) return undefined;

  // Non-admins can see feedback they authored or were the subject of
  return {
    OR: [{ authorId: requesterId }, { subjectId: requesterId }],
  };
}

async function searchTasks(
  query: string,
  requesterId: string,
  requesterRole: Role,
  dateFilter: Prisma.TaskEntryWhereInput,
): Promise<SearchResultItem[]> {
  const scopeFilter = await buildVisibilityScopeFilter(requesterId, requesterRole);

  const where: Prisma.TaskEntryWhereInput = {
    deletedAt: null,
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ],
    ...dateFilter,
    ...(scopeFilter ? { AND: [scopeFilter] } : {}),
  };

  const tasks = await prisma.taskEntry.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  return tasks.map((task) => {
    const highlights = buildHighlights(
      [
        { name: 'title', value: task.title },
        { name: 'description', value: task.description },
      ],
      query,
    );
    const meta: TaskSearchMeta = {
      type: 'task',
      status: task.status as TaskSearchMeta['status'],
      priority: task.priority as TaskSearchMeta['priority'],
      visibility: task.visibility as TaskSearchMeta['visibility'],
      tags: task.tags,
      due_date: task.dueDate?.toISOString() ?? null,
    };
    return {
      id: task.id,
      type: 'task' as const,
      title: task.title,
      body: task.description,
      user_id: task.userId,
      created_at: task.createdAt.toISOString(),
      updated_at: task.updatedAt.toISOString(),
      highlights,
      meta,
    };
  });
}

async function searchIssues(
  query: string,
  requesterId: string,
  requesterRole: Role,
  dateFilter: Prisma.IssueEntryWhereInput,
): Promise<SearchResultItem[]> {
  const scopeFilter = await buildVisibilityScopeFilter(requesterId, requesterRole);

  const where: Prisma.IssueEntryWhereInput = {
    deletedAt: null,
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ],
    ...dateFilter,
    ...(scopeFilter ? { AND: [scopeFilter] } : {}),
  };

  const issues = await prisma.issueEntry.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  return issues.map((issue) => {
    const highlights = buildHighlights(
      [
        { name: 'title', value: issue.title },
        { name: 'description', value: issue.description },
      ],
      query,
    );
    const meta: IssueSearchMeta = {
      type: 'issue',
      status: issue.status as IssueSearchMeta['status'],
      severity: issue.severity as IssueSearchMeta['severity'],
      visibility: issue.visibility as IssueSearchMeta['visibility'],
      tags: issue.tags,
    };
    return {
      id: issue.id,
      type: 'issue' as const,
      title: issue.title,
      body: issue.description,
      user_id: issue.userId,
      created_at: issue.createdAt.toISOString(),
      updated_at: issue.updatedAt.toISOString(),
      highlights,
      meta,
    };
  });
}

async function searchFeedback(
  query: string,
  requesterId: string,
  requesterRole: Role,
  dateFilter: Prisma.FeedbackEntryWhereInput,
): Promise<SearchResultItem[]> {
  const scopeFilter = await buildFeedbackScopeFilter(requesterId, requesterRole);

  const where: Prisma.FeedbackEntryWhereInput = {
    deletedAt: null,
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { body: { contains: query, mode: 'insensitive' } },
    ],
    ...dateFilter,
    ...(scopeFilter ? { AND: [scopeFilter] } : {}),
  };

  const feedbackEntries = await prisma.feedbackEntry.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  return feedbackEntries.map((fb) => {
    const highlights = buildHighlights(
      [
        { name: 'title', value: fb.title },
        { name: 'body', value: fb.body },
      ],
      query,
    );
    const meta: FeedbackSearchMeta = {
      type: 'feedback',
      feedback_type: fb.type as FeedbackSearchMeta['feedback_type'],
      rating: fb.rating,
      author_id: fb.authorId,
      subject_id: fb.subjectId,
    };
    return {
      id: fb.id,
      type: 'feedback' as const,
      title: fb.title,
      body: fb.body,
      user_id: fb.authorId,
      created_at: fb.createdAt.toISOString(),
      updated_at: fb.updatedAt.toISOString(),
      highlights,
      meta,
    };
  });
}

async function searchNotes(
  query: string,
  requesterId: string,
  requesterRole: Role,
  dateFilter: Prisma.NoteEntryWhereInput,
): Promise<SearchResultItem[]> {
  const scopeFilter = await buildVisibilityScopeFilter(requesterId, requesterRole);

  const where: Prisma.NoteEntryWhereInput = {
    deletedAt: null,
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { body: { contains: query, mode: 'insensitive' } },
    ],
    ...dateFilter,
    ...(scopeFilter ? { AND: [scopeFilter] } : {}),
  };

  const notes = await prisma.noteEntry.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  return notes.map((note) => {
    const highlights = buildHighlights(
      [
        { name: 'title', value: note.title },
        { name: 'body', value: note.body },
      ],
      query,
    );
    const meta: NoteSearchMeta = {
      type: 'note',
      visibility: note.visibility as NoteSearchMeta['visibility'],
      mood_rating: note.moodRating,
      entry_date: note.entryDate.toISOString(),
      tags: note.tags,
    };
    return {
      id: note.id,
      type: 'note' as const,
      title: note.title,
      body: note.body,
      user_id: note.userId,
      created_at: note.createdAt.toISOString(),
      updated_at: note.updatedAt.toISOString(),
      highlights,
      meta,
    };
  });
}

export async function globalSearch(
  params: GlobalSearchParamsSchema,
  requesterId: string,
  requesterRole: Role,
): Promise<PaginatedResponse<SearchResultItem>> {
  const { q, types, page, limit, from_date, to_date, sort_by, sort_order } = params;

  const entityTypes: SearchEntityType[] = types ?? ['task', 'issue', 'feedback', 'note'];

  // Date filter for createdAt
  const dateFilter = from_date || to_date
    ? {
        createdAt: {
          ...(from_date ? { gte: new Date(from_date) } : {}),
          ...(to_date ? { lte: new Date(to_date + 'T23:59:59.999Z') } : {}),
        },
      }
    : {};

  // Run searches in parallel for requested entity types
  const searchPromises: Promise<SearchResultItem[]>[] = [];

  if (entityTypes.includes('task')) {
    searchPromises.push(searchTasks(q, requesterId, requesterRole, dateFilter));
  }
  if (entityTypes.includes('issue')) {
    searchPromises.push(searchIssues(q, requesterId, requesterRole, dateFilter));
  }
  if (entityTypes.includes('feedback')) {
    searchPromises.push(searchFeedback(q, requesterId, requesterRole, dateFilter));
  }
  if (entityTypes.includes('note')) {
    searchPromises.push(searchNotes(q, requesterId, requesterRole, dateFilter));
  }

  const results = (await Promise.all(searchPromises)).flat();

  // Sort
  if (sort_by === 'relevance') {
    // Relevance: prioritize items with more highlights and title matches
    const lowerQuery = q.toLowerCase();
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(lowerQuery) ? 1 : 0;
      const bTitle = b.title.toLowerCase().includes(lowerQuery) ? 1 : 0;
      if (aTitle !== bTitle) return bTitle - aTitle;
      if (a.highlights.length !== b.highlights.length) return b.highlights.length - a.highlights.length;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  } else {
    const field = sort_by === 'created_at' ? 'created_at' : 'updated_at';
    const multiplier = sort_order === 'asc' ? 1 : -1;
    results.sort(
      (a, b) => multiplier * (new Date(a[field]).getTime() - new Date(b[field]).getTime()),
    );
  }

  // Paginate
  const totalCount = results.length;
  const skip = (page - 1) * limit;
  const paginatedResults = results.slice(skip, skip + limit);
  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: paginatedResults,
    meta: {
      page,
      limit,
      total_count: totalCount,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  };
}
