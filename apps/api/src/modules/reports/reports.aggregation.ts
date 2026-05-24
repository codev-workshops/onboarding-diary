import type {
  TaskReportData,
  IssueReportData,
  FeedbackReportData,
} from '@onboarding-diary/shared';
import { prisma } from '../../config/database.js';

export async function aggregateTaskData(
  recruitId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<TaskReportData> {
  const where = {
    userId: recruitId,
    deletedAt: null,
    createdAt: { gte: periodStart, lte: periodEnd },
  };

  const [pending, inProgress, completed, blocked, overdue, entries] =
    await prisma.$transaction([
      prisma.taskEntry.count({ where: { ...where, status: 'PENDING' } }),
      prisma.taskEntry.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.taskEntry.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.taskEntry.count({ where: { ...where, status: 'BLOCKED' } }),
      prisma.taskEntry.count({
        where: {
          ...where,
          status: { notIn: ['COMPLETED'] },
          dueDate: { lt: new Date() },
        },
      }),
      prisma.taskEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          tags: true,
        },
      }),
    ]);

  const total = pending + inProgress + completed + blocked;

  return {
    total,
    completed,
    in_progress: inProgress,
    pending,
    blocked,
    completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    overdue,
    entries: entries.map((e) => ({
      id: e.id,
      title: e.title,
      status: e.status,
      priority: e.priority,
      due_date: e.dueDate?.toISOString() ?? null,
      completed_at: e.completedAt?.toISOString() ?? null,
      created_at: e.createdAt.toISOString(),
      tags: e.tags,
    })),
  };
}

export async function aggregateIssueData(
  recruitId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<IssueReportData> {
  const where = {
    userId: recruitId,
    deletedAt: null,
    createdAt: { gte: periodStart, lte: periodEnd },
  };

  const [open, inProgress, resolved, closed, critical, high, resolvedEntries, entries] =
    await prisma.$transaction([
      prisma.issueEntry.count({ where: { ...where, status: 'OPEN' } }),
      prisma.issueEntry.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.issueEntry.count({ where: { ...where, status: 'RESOLVED' } }),
      prisma.issueEntry.count({ where: { ...where, status: 'CLOSED' } }),
      prisma.issueEntry.count({ where: { ...where, severity: 'CRITICAL' } }),
      prisma.issueEntry.count({ where: { ...where, severity: 'HIGH' } }),
      prisma.issueEntry.findMany({
        where: { ...where, resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
      }),
      prisma.issueEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
          resolutionNote: true,
          resolvedAt: true,
          createdAt: true,
        },
      }),
    ]);

  const total = open + inProgress + resolved + closed;

  let avgResolutionHours: number | null = null;
  if (resolvedEntries.length > 0) {
    const totalMs = resolvedEntries.reduce(
      (sum, e) => sum + (e.resolvedAt!.getTime() - e.createdAt.getTime()),
      0,
    );
    avgResolutionHours = Math.round((totalMs / resolvedEntries.length / 3600000) * 10) / 10;
  }

  return {
    total,
    open,
    in_progress: inProgress,
    resolved,
    closed,
    critical,
    high,
    avg_resolution_hours: avgResolutionHours,
    entries: entries.map((e) => ({
      id: e.id,
      title: e.title,
      severity: e.severity,
      status: e.status,
      resolution_note: e.resolutionNote,
      resolved_at: e.resolvedAt?.toISOString() ?? null,
      created_at: e.createdAt.toISOString(),
    })),
  };
}

export async function aggregateFeedbackData(
  recruitId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<FeedbackReportData> {
  const dateRange = { gte: periodStart, lte: periodEnd };

  const [received, given, entries] = await prisma.$transaction([
    prisma.feedbackEntry.count({
      where: { subjectId: recruitId, deletedAt: null, createdAt: dateRange },
    }),
    prisma.feedbackEntry.count({
      where: { authorId: recruitId, deletedAt: null, createdAt: dateRange },
    }),
    prisma.feedbackEntry.findMany({
      where: {
        deletedAt: null,
        createdAt: dateRange,
        OR: [{ subjectId: recruitId }, { authorId: recruitId }],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        rating: true,
        createdAt: true,
        author: { select: { firstName: true, lastName: true } },
        subject: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const total = received + given;
  const ratingsWithValue = entries.filter((e) => e.rating !== null);
  const avgRating =
    ratingsWithValue.length > 0
      ? Math.round(
          (ratingsWithValue.reduce((s, e) => s + e.rating!, 0) / ratingsWithValue.length) * 10,
        ) / 10
      : null;

  const typeMap = new Map<string, number>();
  for (const e of entries) {
    typeMap.set(e.type, (typeMap.get(e.type) ?? 0) + 1);
  }

  return {
    total,
    received,
    given,
    avg_rating: avgRating,
    by_type: Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })),
    entries: entries.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      rating: e.rating,
      author_name: `${e.author.firstName} ${e.author.lastName}`,
      subject_name: `${e.subject.firstName} ${e.subject.lastName}`,
      created_at: e.createdAt.toISOString(),
    })),
  };
}
