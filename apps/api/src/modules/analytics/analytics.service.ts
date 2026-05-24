import type {
  TaskCompletionTrendsDto,
  IssueTrendsDto,
  FeedbackSentimentDto,
  RecruitActivityDto,
  AnalyticsOverviewDto,
  StatusDatePoint,
  IssueStatusDatePoint,
  RecruitActivityPoint,
} from '@onboarding-diary/shared';
import { Role } from '@onboarding-diary/shared';
import type { AnalyticsParamsSchema } from '@onboarding-diary/shared';
import { prisma } from '../../config/database.js';
import { AppError } from '../../errors/AppError.js';

// ── Helpers ────────────────────────────────────────────────────

function defaultDateRange(params: AnalyticsParamsSchema): { from: Date; to: Date } {
  const to = params.to_date ? new Date(params.to_date + 'T23:59:59.999Z') : new Date();
  const from = params.from_date
    ? new Date(params.from_date)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from, to };
}

function generateDateRange(from: Date, to: Date): string[] {
  const dates: string[] = [];
  const current = new Date(from);
  current.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function buildUserScope(
  requesterId: string,
  requesterRole: Role,
  recruitId?: string,
): { userId?: string; userId_in?: string[] } | null {
  if (recruitId) {
    if (requesterRole === Role.RECRUIT && recruitId !== requesterId) {
      return null;
    }
    return { userId: recruitId };
  }

  if (requesterRole === Role.RECRUIT) {
    return { userId: requesterId };
  }

  return {};
}

async function getRecruitIdsForManager(managerId: string): Promise<string[]> {
  const assignments = await prisma.managerRecruitRelationship.findMany({
    where: { managerId, isActive: true },
    select: { recruitId: true },
  });
  return [managerId, ...assignments.map((a) => a.recruitId)];
}

async function resolveUserFilter(
  requesterId: string,
  requesterRole: Role,
  recruitId?: string,
): Promise<Record<string, unknown>> {
  const scope = buildUserScope(requesterId, requesterRole, recruitId);
  if (scope === null) {
    throw new AppError(403, 'ACCESS_DENIED', 'You can only view your own analytics');
  }

  if (scope.userId) {
    return { userId: scope.userId, deletedAt: null };
  }

  if (requesterRole === Role.ADMIN) {
    return { deletedAt: null };
  }

  const userIds = await getRecruitIdsForManager(requesterId);
  return { userId: { in: userIds }, deletedAt: null };
}

// ── Task Completion Trends ─────────────────────────────────────

export async function getTaskCompletionTrends(
  params: AnalyticsParamsSchema,
  requesterId: string,
  requesterRole: Role,
): Promise<TaskCompletionTrendsDto> {
  const { from, to } = defaultDateRange(params);
  const baseFilter = await resolveUserFilter(requesterId, requesterRole, params.recruit_id);
  const dateFilter = { createdAt: { gte: from, lte: to } };
  const where = { ...baseFilter, ...dateFilter };

  const [tasks, totalTasks, completedTasks] = await prisma.$transaction([
    prisma.taskEntry.findMany({
      where,
      select: { status: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.taskEntry.count({ where: baseFilter }),
    prisma.taskEntry.count({ where: { ...baseFilter, status: 'COMPLETED' } }),
  ]);

  const dateRange = generateDateRange(from, to);
  const dayMap = new Map<string, StatusDatePoint>();
  for (const date of dateRange) {
    dayMap.set(date, { date, pending: 0, in_progress: 0, completed: 0, blocked: 0 });
  }

  for (const task of tasks) {
    const date = task.createdAt.toISOString().slice(0, 10);
    const point = dayMap.get(date);
    if (!point) continue;

    switch (task.status) {
      case 'PENDING':
        point.pending++;
        break;
      case 'IN_PROGRESS':
        point.in_progress++;
        break;
      case 'COMPLETED':
        point.completed++;
        break;
      case 'BLOCKED':
        point.blocked++;
        break;
    }
  }

  const daily = Array.from(dayMap.values());
  const totalCompleted = daily.reduce((sum, d) => sum + d.completed, 0);
  const daysWithData = daily.filter(
    (d) => d.pending + d.in_progress + d.completed + d.blocked > 0,
  ).length;

  return {
    daily,
    summary: {
      total: totalTasks,
      completed: completedTasks,
      completion_rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      avg_daily_completed: daysWithData > 0 ? Math.round((totalCompleted / daysWithData) * 10) / 10 : 0,
    },
  };
}

// ── Issue Trends ───────────────────────────────────────────────

export async function getIssueTrends(
  params: AnalyticsParamsSchema,
  requesterId: string,
  requesterRole: Role,
): Promise<IssueTrendsDto> {
  const { from, to } = defaultDateRange(params);
  const baseFilter = await resolveUserFilter(requesterId, requesterRole, params.recruit_id);
  const dateFilter = { createdAt: { gte: from, lte: to } };
  const where = { ...baseFilter, ...dateFilter };

  const [issues, totalIssues, openIssues, resolvedIssues, resolvedWithTime] =
    await prisma.$transaction([
      prisma.issueEntry.findMany({
        where,
        select: { status: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.issueEntry.count({ where: baseFilter }),
      prisma.issueEntry.count({
        where: { ...baseFilter, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      prisma.issueEntry.count({ where: { ...baseFilter, status: { in: ['RESOLVED', 'CLOSED'] } } }),
      prisma.issueEntry.findMany({
        where: { ...baseFilter, resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
      }),
    ]);

  const dateRange = generateDateRange(from, to);
  const dayMap = new Map<string, IssueStatusDatePoint>();
  for (const date of dateRange) {
    dayMap.set(date, { date, open: 0, in_progress: 0, resolved: 0, closed: 0 });
  }

  for (const issue of issues) {
    const date = issue.createdAt.toISOString().slice(0, 10);
    const point = dayMap.get(date);
    if (!point) continue;

    switch (issue.status) {
      case 'OPEN':
        point.open++;
        break;
      case 'IN_PROGRESS':
        point.in_progress++;
        break;
      case 'RESOLVED':
        point.resolved++;
        break;
      case 'CLOSED':
        point.closed++;
        break;
    }
  }

  let avgResolutionHours: number | null = null;
  if (resolvedWithTime.length > 0) {
    const totalHours = resolvedWithTime.reduce((sum, i) => {
      const diff = i.resolvedAt!.getTime() - i.createdAt.getTime();
      return sum + diff / (1000 * 60 * 60);
    }, 0);
    avgResolutionHours = Math.round((totalHours / resolvedWithTime.length) * 10) / 10;
  }

  return {
    daily: Array.from(dayMap.values()),
    summary: {
      total: totalIssues,
      open: openIssues,
      resolved: resolvedIssues,
      avg_resolution_time_hours: avgResolutionHours,
    },
  };
}

// ── Feedback Sentiment Breakdown ───────────────────────────────

export async function getFeedbackSentiment(
  params: AnalyticsParamsSchema,
  requesterId: string,
  requesterRole: Role,
): Promise<FeedbackSentimentDto> {
  const { from, to } = defaultDateRange(params);

  let authorFilter: Record<string, unknown>;
  if (params.recruit_id) {
    if (requesterRole === Role.RECRUIT && params.recruit_id !== requesterId) {
      throw new AppError(403, 'ACCESS_DENIED', 'You can only view your own analytics');
    }
    authorFilter = {
      OR: [{ authorId: params.recruit_id }, { subjectId: params.recruit_id }],
      deletedAt: null,
    };
  } else if (requesterRole === Role.RECRUIT) {
    authorFilter = {
      OR: [{ authorId: requesterId }, { subjectId: requesterId }],
      deletedAt: null,
    };
  } else if (requesterRole === Role.MANAGER) {
    const recruitIds = await getRecruitIdsForManager(requesterId);
    authorFilter = {
      OR: [{ authorId: { in: recruitIds } }, { subjectId: { in: recruitIds } }],
      deletedAt: null,
    };
  } else {
    authorFilter = { deletedAt: null };
  }

  const dateFilter = { createdAt: { gte: from, lte: to } };
  const where = { ...authorFilter, ...dateFilter };

  const [feedback, totalFeedback] = await prisma.$transaction([
    prisma.feedbackEntry.findMany({
      where,
      select: { type: true, rating: true },
    }),
    prisma.feedbackEntry.count({ where: authorFilter }),
  ]);

  const typeCounts = new Map<string, number>();
  const ratingCounts = new Map<number, number>();
  let ratingSum = 0;
  let ratingCount = 0;

  for (const f of feedback) {
    typeCounts.set(f.type, (typeCounts.get(f.type) ?? 0) + 1);
    if (f.rating !== null) {
      ratingCounts.set(f.rating, (ratingCounts.get(f.rating) ?? 0) + 1);
      ratingSum += f.rating;
      ratingCount++;
    }
  }

  const total = feedback.length;
  const breakdown = ['POSITIVE', 'NEUTRAL', 'CONSTRUCTIVE'].map((type) => {
    const count = typeCounts.get(type) ?? 0;
    return {
      type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: ratingCounts.get(rating) ?? 0,
  }));

  return {
    breakdown,
    total: totalFeedback,
    avg_rating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
    rating_distribution: ratingDistribution,
  };
}

// ── Recruit Activity ───────────────────────────────────────────

export async function getRecruitActivity(
  params: AnalyticsParamsSchema,
  requesterId: string,
  requesterRole: Role,
): Promise<RecruitActivityDto> {
  const { from, to } = defaultDateRange(params);
  const baseFilter = await resolveUserFilter(requesterId, requesterRole, params.recruit_id);
  const dateFilter = { createdAt: { gte: from, lte: to } };
  const where = { ...baseFilter, ...dateFilter };

  const feedbackBaseFilter = params.recruit_id
    ? { OR: [{ authorId: params.recruit_id }, { subjectId: params.recruit_id }], deletedAt: null }
    : requesterRole === Role.RECRUIT
      ? { OR: [{ authorId: requesterId }, { subjectId: requesterId }], deletedAt: null }
      : requesterRole === Role.MANAGER
        ? await (async () => {
            const ids = await getRecruitIdsForManager(requesterId);
            return {
              OR: [{ authorId: { in: ids } }, { subjectId: { in: ids } }],
              deletedAt: null,
            };
          })()
        : { deletedAt: null };
  const feedbackWhere = { ...feedbackBaseFilter, ...dateFilter };

  const [tasks, issues, notes, feedbackEntries] = await Promise.all([
    prisma.taskEntry.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.issueEntry.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.noteEntry.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.feedbackEntry.findMany({
      where: feedbackWhere,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const dateRange = generateDateRange(from, to);
  const dayMap = new Map<string, RecruitActivityPoint>();
  for (const date of dateRange) {
    dayMap.set(date, { date, tasks: 0, issues: 0, notes: 0, feedback: 0 });
  }

  for (const t of tasks) {
    const d = t.createdAt.toISOString().slice(0, 10);
    const p = dayMap.get(d);
    if (p) p.tasks++;
  }
  for (const i of issues) {
    const d = i.createdAt.toISOString().slice(0, 10);
    const p = dayMap.get(d);
    if (p) p.issues++;
  }
  for (const n of notes) {
    const d = n.createdAt.toISOString().slice(0, 10);
    const p = dayMap.get(d);
    if (p) p.notes++;
  }
  for (const f of feedbackEntries) {
    const d = f.createdAt.toISOString().slice(0, 10);
    const p = dayMap.get(d);
    if (p) p.feedback++;
  }

  const daily = Array.from(dayMap.values());
  const totalEntries = tasks.length + issues.length + notes.length + feedbackEntries.length;
  const daysWithActivity = daily.filter(
    (d) => d.tasks + d.issues + d.notes + d.feedback > 0,
  ).length;

  let mostActiveDay: string | null = null;
  let maxEntries = 0;
  for (const d of daily) {
    const total = d.tasks + d.issues + d.notes + d.feedback;
    if (total > maxEntries) {
      maxEntries = total;
      mostActiveDay = d.date;
    }
  }

  return {
    daily,
    summary: {
      total_entries: totalEntries,
      most_active_day: mostActiveDay,
      avg_daily_entries:
        daysWithActivity > 0 ? Math.round((totalEntries / daysWithActivity) * 10) / 10 : 0,
    },
  };
}

// ── Combined Overview ──────────────────────────────────────────

export async function getAnalyticsOverview(
  params: AnalyticsParamsSchema,
  requesterId: string,
  requesterRole: Role,
): Promise<AnalyticsOverviewDto> {
  const [taskTrends, issueTrends, feedbackSentiment, recruitActivity] = await Promise.all([
    getTaskCompletionTrends(params, requesterId, requesterRole),
    getIssueTrends(params, requesterId, requesterRole),
    getFeedbackSentiment(params, requesterId, requesterRole),
    getRecruitActivity(params, requesterId, requesterRole),
  ]);

  return {
    task_trends: taskTrends,
    issue_trends: issueTrends,
    feedback_sentiment: feedbackSentiment,
    recruit_activity: recruitActivity,
  };
}
