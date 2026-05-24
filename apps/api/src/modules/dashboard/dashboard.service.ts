import type {
  RecruitDashboardDto,
  ManagerDashboardDto,
  AdminDashboardDto,
  RecentEntryDto,
  RecruitSummaryDto,
  TaskStatusCount,
} from '@onboarding-diary/shared';
import { TaskStatus } from '@onboarding-diary/shared';
import { prisma } from '../../config/database.js';

const RECENT_LIMIT = 5;

// ── Recruit Dashboard ──────────────────────────────────────────

export async function getRecruitDashboard(userId: string): Promise<RecruitDashboardDto> {
  const now = new Date();

  const [
    pendingTasks,
    inProgressTasks,
    completedTasks,
    blockedTasks,
    overdueTasks,
    openIssues,
    inProgressIssues,
    resolvedIssues,
    closedIssues,
    recentTasks,
    recentIssues,
    recentNotes,
    lastEntry,
  ] = await prisma.$transaction([
    prisma.taskEntry.count({ where: { userId, deletedAt: null, status: 'PENDING' } }),
    prisma.taskEntry.count({ where: { userId, deletedAt: null, status: 'IN_PROGRESS' } }),
    prisma.taskEntry.count({ where: { userId, deletedAt: null, status: 'COMPLETED' } }),
    prisma.taskEntry.count({ where: { userId, deletedAt: null, status: 'BLOCKED' } }),
    prisma.taskEntry.count({
      where: { userId, deletedAt: null, status: { notIn: ['COMPLETED'] }, dueDate: { lt: now } },
    }),
    prisma.issueEntry.count({ where: { userId, deletedAt: null, status: 'OPEN' } }),
    prisma.issueEntry.count({ where: { userId, deletedAt: null, status: 'IN_PROGRESS' } }),
    prisma.issueEntry.count({ where: { userId, deletedAt: null, status: 'RESOLVED' } }),
    prisma.issueEntry.count({ where: { userId, deletedAt: null, status: 'CLOSED' } }),
    prisma.taskEntry.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: RECENT_LIMIT,
      select: { id: true, title: true, status: true, createdAt: true },
    }),
    prisma.issueEntry.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: RECENT_LIMIT,
      select: { id: true, title: true, status: true, createdAt: true },
    }),
    prisma.noteEntry.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: RECENT_LIMIT,
      select: { id: true, title: true, createdAt: true },
    }),
    prisma.$queryRaw<{ last_date: Date | null }[]>`
      SELECT MAX(created_at) as last_date FROM (
        SELECT created_at FROM task_entries WHERE user_id = ${userId} AND deleted_at IS NULL
        UNION ALL
        SELECT created_at FROM issue_entries WHERE user_id = ${userId} AND deleted_at IS NULL
        UNION ALL
        SELECT created_at FROM note_entries WHERE user_id = ${userId} AND deleted_at IS NULL
      ) entries
    `,
  ]);

  const taskTotal = pendingTasks + inProgressTasks + completedTasks + blockedTasks;
  const issueTotal = openIssues + inProgressIssues + resolvedIssues + closedIssues;

  const byStatus: TaskStatusCount[] = [
    { status: TaskStatus.PENDING, count: pendingTasks },
    { status: TaskStatus.IN_PROGRESS, count: inProgressTasks },
    { status: TaskStatus.COMPLETED, count: completedTasks },
    { status: TaskStatus.BLOCKED, count: blockedTasks },
  ];

  // Streak calculation
  const lastDate = lastEntry[0]?.last_date;
  let streakDays = 0;
  if (lastDate) {
    const entryCounts = await prisma.$queryRaw<{ entry_date: Date }[]>`
      SELECT DISTINCT DATE(created_at) as entry_date FROM (
        SELECT created_at FROM task_entries WHERE user_id = ${userId} AND deleted_at IS NULL
        UNION ALL
        SELECT created_at FROM issue_entries WHERE user_id = ${userId} AND deleted_at IS NULL
        UNION ALL
        SELECT created_at FROM note_entries WHERE user_id = ${userId} AND deleted_at IS NULL
      ) entries
      ORDER BY entry_date DESC
      LIMIT 30
    `;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates = entryCounts.map((r) => {
      const d = new Date(r.entry_date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });

    let checkDate = today.getTime();
    if (dates.length > 0 && dates[0] !== checkDate) {
      checkDate -= 86400000;
    }
    for (const d of dates) {
      if (d === checkDate) {
        streakDays++;
        checkDate -= 86400000;
      } else if (d < checkDate) {
        break;
      }
    }
  }

  return {
    task_stats: {
      total: taskTotal,
      by_status: byStatus,
      completion_rate: taskTotal > 0 ? Math.round((completedTasks / taskTotal) * 100) : 0,
      overdue: overdueTasks,
    },
    issue_summary: {
      total: issueTotal,
      open: openIssues,
      in_progress: inProgressIssues,
      resolved: resolvedIssues,
      closed: closedIssues,
    },
    recent_tasks: recentTasks.map((t) => toRecentEntry(t, 'task')),
    recent_issues: recentIssues.map((i) => toRecentEntry(i, 'issue')),
    recent_notes: recentNotes.map((n) => toRecentEntry(n, 'note')),
    streak: {
      current_days: streakDays,
      last_entry_date: lastDate?.toISOString() ?? null,
    },
  };
}

// ── Manager Dashboard ──────────────────────────────────────────

export async function getManagerDashboard(managerId: string): Promise<ManagerDashboardDto> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const assignments = await prisma.managerRecruitRelationship.findMany({
    where: { managerId, isActive: true },
    select: {
      recruit: {
        select: { id: true, firstName: true, lastName: true, email: true, status: true },
      },
    },
  });

  const recruitIds = assignments.map((a) => a.recruit.id);
  const activeRecruits = assignments.filter((a) => a.recruit.status === 'ACTIVE');

  const recruitSummaries: RecruitSummaryDto[] = await Promise.all(
    assignments.map(async (a) => {
      const r = a.recruit;

      const [totalTasks, completedTasks, openIssues, weekEntries, lastActivity] =
        await prisma.$transaction([
          prisma.taskEntry.count({ where: { userId: r.id, deletedAt: null } }),
          prisma.taskEntry.count({ where: { userId: r.id, deletedAt: null, status: 'COMPLETED' } }),
          prisma.issueEntry.count({
            where: { userId: r.id, deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] } },
          }),
          prisma.taskEntry.count({
            where: { userId: r.id, deletedAt: null, createdAt: { gte: weekAgo } },
          }),
          prisma.$queryRaw<{ last_date: Date | null }[]>`
            SELECT MAX(created_at) as last_date FROM (
              SELECT created_at FROM task_entries WHERE user_id = ${r.id} AND deleted_at IS NULL
              UNION ALL
              SELECT created_at FROM issue_entries WHERE user_id = ${r.id} AND deleted_at IS NULL
              UNION ALL
              SELECT created_at FROM note_entries WHERE user_id = ${r.id} AND deleted_at IS NULL
            ) entries
          `,
        ]);

      return {
        id: r.id,
        first_name: r.firstName,
        last_name: r.lastName,
        email: r.email,
        task_completion_rate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        open_issues: openIssues,
        total_entries_this_week: weekEntries,
        last_activity_at: lastActivity[0]?.last_date?.toISOString() ?? null,
      };
    }),
  );

  // Open blockers (HIGH/CRITICAL issues or BLOCKED tasks)
  const [blockerIssues, blockerTasks, recentActivity] = await prisma.$transaction([
    prisma.issueEntry.findMany({
      where: {
        userId: { in: recruitIds },
        deletedAt: null,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        severity: { in: ['HIGH', 'CRITICAL'] },
        visibility: { not: 'PRIVATE' },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, title: true, status: true, severity: true, createdAt: true },
    }),
    prisma.taskEntry.findMany({
      where: {
        userId: { in: recruitIds },
        deletedAt: null,
        status: 'BLOCKED',
        visibility: { not: 'PRIVATE' },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, status: true, createdAt: true },
    }),
    prisma.taskEntry.findMany({
      where: {
        userId: { in: recruitIds },
        deletedAt: null,
        visibility: { not: 'PRIVATE' },
        createdAt: { gte: weekAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, title: true, status: true, createdAt: true },
    }),
  ]);

  const blockerEntries: RecentEntryDto[] = [
    ...blockerIssues.map((i) => toRecentEntry(i, 'issue')),
    ...blockerTasks.map((t) => toRecentEntry(t, 'task')),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const criticalCount = blockerIssues.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = blockerIssues.filter((i) => i.severity === 'HIGH').length;

  const avgCompletion =
    recruitSummaries.length > 0
      ? Math.round(
          recruitSummaries.reduce((s, r) => s + r.task_completion_rate, 0) / recruitSummaries.length,
        )
      : 0;

  return {
    team_overview: {
      total_recruits: assignments.length,
      active_recruits: activeRecruits.length,
      avg_task_completion_rate: avgCompletion,
    },
    recruits: recruitSummaries,
    open_blockers: {
      total: blockerEntries.length,
      critical: criticalCount,
      high: highCount,
      entries: blockerEntries.slice(0, 10),
    },
    recent_activity: recentActivity.map((t) => toRecentEntry(t, 'task')),
  };
}

// ── Admin Dashboard ────────────────────────────────────────────

export async function getAdminDashboard(): Promise<AdminDashboardDto> {
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [
    recruitCount,
    managerCount,
    adminCount,
    activeUsers,
    inactiveUsers,
    invitedUsers,
    newUsersThisMonth,
    totalTasks,
    totalIssues,
    totalNotes,
    totalFeedback,
    totalAssignments,
    openIssues,
    criticalOpenIssues,
    resolvedIssuesData,
    recentSignups,
  ] = await prisma.$transaction([
    prisma.user.count({ where: { deletedAt: null, role: 'RECRUIT' } }),
    prisma.user.count({ where: { deletedAt: null, role: 'MANAGER' } }),
    prisma.user.count({ where: { deletedAt: null, role: 'ADMIN' } }),
    prisma.user.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
    prisma.user.count({ where: { deletedAt: null, status: 'INACTIVE' } }),
    prisma.user.count({ where: { deletedAt: null, status: 'INVITED' } }),
    prisma.user.count({ where: { deletedAt: null, createdAt: { gte: monthAgo } } }),
    prisma.taskEntry.count({ where: { deletedAt: null } }),
    prisma.issueEntry.count({ where: { deletedAt: null } }),
    prisma.noteEntry.count({ where: { deletedAt: null } }),
    prisma.feedbackEntry.count({ where: { deletedAt: null } }),
    prisma.managerRecruitRelationship.count({ where: { isActive: true } }),
    prisma.issueEntry.count({
      where: { deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    prisma.issueEntry.count({
      where: { deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] }, severity: 'CRITICAL' },
    }),
    prisma.issueEntry.findMany({
      where: { deletedAt: null, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
      take: 500,
      orderBy: { resolvedAt: 'desc' },
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    }),
  ]);

  const totalUsers = recruitCount + managerCount + adminCount;

  let avgResolutionTimeHours: number | null = null;
  if (resolvedIssuesData.length > 0) {
    const totalMs = resolvedIssuesData.reduce((sum, issue) => {
      return sum + (issue.resolvedAt!.getTime() - issue.createdAt.getTime());
    }, 0);
    avgResolutionTimeHours =
      Math.round((totalMs / resolvedIssuesData.length / 3600000) * 10) / 10;
  }

  return {
    user_stats: {
      total: totalUsers,
      by_role: [
        { role: 'RECRUIT', count: recruitCount },
        { role: 'MANAGER', count: managerCount },
        { role: 'ADMIN', count: adminCount },
      ],
      by_status: [
        { status: 'ACTIVE', count: activeUsers },
        { status: 'INACTIVE', count: inactiveUsers },
        { status: 'INVITED', count: invitedUsers },
      ],
      new_this_month: newUsersThisMonth,
    },
    system_metrics: {
      total_tasks: totalTasks,
      total_issues: totalIssues,
      total_notes: totalNotes,
      total_feedback: totalFeedback,
      total_assignments: totalAssignments,
    },
    issue_overview: {
      open: openIssues,
      critical_open: criticalOpenIssues,
      avg_resolution_time_hours: avgResolutionTimeHours,
    },
    recent_signups: recentSignups.map((u) => ({
      id: u.id,
      email: u.email,
      first_name: u.firstName,
      last_name: u.lastName,
      role: u.role,
      created_at: u.createdAt.toISOString(),
    })),
  };
}

// ── Helpers ────────────────────────────────────────────────────

function toRecentEntry(
  entry: { id: string; title: string; status?: string; createdAt: Date },
  type: 'task' | 'issue' | 'note',
): RecentEntryDto {
  return {
    id: entry.id,
    title: entry.title,
    type,
    ...(entry.status ? { status: entry.status } : {}),
    created_at: entry.createdAt.toISOString(),
  };
}
