import type { Prisma } from '@prisma/client';
import type {
  ReportDto,
  CreateReportSchema,
  UpdateReportSchema,
  ReportListParamsSchema,
  ReportGeneratedData,
  PaginatedResponse,
} from '@onboarding-diary/shared';
import { ReportContentType, Role } from '@onboarding-diary/shared';
import { prisma } from '../../config/database.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors/AppError.js';
import {
  aggregateTaskData,
  aggregateIssueData,
  aggregateFeedbackData,
} from './reports.aggregation.js';
import { generatePdf } from './export/pdf.export.js';
import { generateCsv } from './export/csv.export.js';

function toReportDto(report: {
  id: string;
  recruitId: string;
  generatedById: string;
  type: string;
  status: string;
  title: string;
  summary: string | null;
  periodStart: Date;
  periodEnd: Date;
  generatedData: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): ReportDto {
  return {
    id: report.id,
    recruit_id: report.recruitId,
    generated_by: report.generatedById,
    type: report.type as ReportDto['type'],
    status: report.status as ReportDto['status'],
    title: report.title,
    summary: report.summary,
    period_start: report.periodStart.toISOString(),
    period_end: report.periodEnd.toISOString(),
    generated_data: report.generatedData as Record<string, unknown> | null,
    created_at: report.createdAt.toISOString(),
    updated_at: report.updatedAt.toISOString(),
  };
}

const SORT_FIELD_MAP: Record<string, string> = {
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  period_start: 'periodStart',
  type: 'type',
  status: 'status',
};

async function assertReportAccess(
  report: { recruitId: string; generatedById: string },
  requesterId: string,
  requesterRole: Role,
): Promise<void> {
  if (requesterRole === Role.ADMIN) return;
  if (report.generatedById === requesterId) return;
  if (report.recruitId === requesterId) return;

  if (requesterRole === Role.MANAGER) {
    const assignment = await prisma.managerRecruitRelationship.findFirst({
      where: { managerId: requesterId, recruitId: report.recruitId, isActive: true },
    });
    if (assignment) return;
  }

  throw new ForbiddenError('You do not have permission to access this report');
}

export async function generateReport(
  generatedById: string,
  requesterRole: Role,
  input: CreateReportSchema,
): Promise<ReportDto> {
  const recruit = await prisma.user.findUnique({
    where: { id: input.recruit_id, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, role: true },
  });

  if (!recruit) {
    throw new NotFoundError('Recruit');
  }

  // Permission checks
  if (requesterRole === Role.RECRUIT) {
    if (recruit.id !== generatedById) {
      throw new ForbiddenError('Recruits can only generate reports for themselves');
    }
  } else if (requesterRole === Role.MANAGER) {
    if (recruit.id !== generatedById) {
      const assignment = await prisma.managerRecruitRelationship.findFirst({
        where: { managerId: generatedById, recruitId: recruit.id, isActive: true },
      });
      if (!assignment) {
        throw new ForbiddenError('You can only generate reports for your assigned recruits');
      }
    }
  }

  const periodStart = new Date(input.period_start);
  const periodEnd = new Date(input.period_end + 'T23:59:59.999Z');

  if (periodEnd < periodStart) {
    throw new BadRequestError('period_end must be after period_start');
  }

  const contentType = input.content_type;

  const generatedData: ReportGeneratedData = {
    content_type: contentType,
    period_start: input.period_start,
    period_end: input.period_end,
    recruit_name: `${recruit.firstName} ${recruit.lastName}`,
    generated_at: new Date().toISOString(),
  };

  if (contentType === ReportContentType.TASKS || contentType === ReportContentType.COMBINED) {
    generatedData.tasks = await aggregateTaskData(recruit.id, periodStart, periodEnd);
  }

  if (contentType === ReportContentType.ISSUES || contentType === ReportContentType.COMBINED) {
    generatedData.issues = await aggregateIssueData(recruit.id, periodStart, periodEnd);
  }

  if (contentType === ReportContentType.FEEDBACK || contentType === ReportContentType.COMBINED) {
    generatedData.feedback = await aggregateFeedbackData(recruit.id, periodStart, periodEnd);
  }

  const report = await prisma.report.create({
    data: {
      recruitId: recruit.id,
      generatedById,
      type: input.type,
      status: 'GENERATED',
      title: input.title,
      summary: input.summary,
      periodStart: new Date(input.period_start),
      periodEnd: new Date(input.period_end),
      generatedData: generatedData as unknown as Prisma.InputJsonValue,
    },
  });

  return toReportDto(report);
}

export async function updateReport(
  reportId: string,
  input: UpdateReportSchema,
  requesterId: string,
  requesterRole: Role,
): Promise<ReportDto> {
  const report = await prisma.report.findUnique({
    where: { id: reportId, deletedAt: null },
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  await assertReportAccess(report, requesterId, requesterRole);

  if (report.generatedById !== requesterId && requesterRole !== Role.ADMIN) {
    throw new ForbiddenError('Only the report creator or an admin can edit this report');
  }

  const data: Prisma.ReportUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.summary !== undefined) data.summary = input.summary;
  if (input.status !== undefined) data.status = input.status;

  const updated = await prisma.report.update({
    where: { id: reportId },
    data,
  });

  return toReportDto(updated);
}

export async function deleteReport(
  reportId: string,
  requesterId: string,
  requesterRole: Role,
): Promise<void> {
  const report = await prisma.report.findUnique({
    where: { id: reportId, deletedAt: null },
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  if (report.generatedById !== requesterId && requesterRole !== Role.ADMIN) {
    throw new ForbiddenError('Only the report creator or an admin can delete this report');
  }

  await prisma.report.update({
    where: { id: reportId },
    data: { deletedAt: new Date() },
  });
}

export async function getReportById(
  reportId: string,
  requesterId: string,
  requesterRole: Role,
): Promise<ReportDto> {
  const report = await prisma.report.findUnique({
    where: { id: reportId, deletedAt: null },
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  await assertReportAccess(report, requesterId, requesterRole);

  return toReportDto(report);
}

export async function listReports(
  query: ReportListParamsSchema,
  requesterId: string,
  requesterRole: Role,
): Promise<PaginatedResponse<ReportDto>> {
  const { page, limit, sort_by, sort_order, type, status, recruit_id, from_date, to_date } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ReportWhereInput = {
    deletedAt: null,
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(recruit_id ? { recruitId: recruit_id } : {}),
    ...(from_date || to_date
      ? {
          periodStart: {
            ...(from_date ? { gte: new Date(from_date) } : {}),
            ...(to_date ? { lte: new Date(to_date + 'T23:59:59.999Z') } : {}),
          },
        }
      : {}),
  };

  // Scope by role
  if (requesterRole === Role.RECRUIT) {
    where.OR = [{ recruitId: requesterId }, { generatedById: requesterId }];
  } else if (requesterRole === Role.MANAGER) {
    const assignments = await prisma.managerRecruitRelationship.findMany({
      where: { managerId: requesterId, isActive: true },
      select: { recruitId: true },
    });
    const recruitIds = assignments.map((a) => a.recruitId);
    where.OR = [
      { generatedById: requesterId },
      { recruitId: requesterId },
      { recruitId: { in: recruitIds } },
    ];
  }

  const orderBy: Prisma.ReportOrderByWithRelationInput = {
    [SORT_FIELD_MAP[sort_by] ?? 'createdAt']: sort_order,
  };

  const [reports, totalCount] = await prisma.$transaction([
    prisma.report.findMany({ where, orderBy, skip, take: limit }),
    prisma.report.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: reports.map(toReportDto),
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

export async function downloadReport(
  reportId: string,
  format: 'PDF' | 'CSV',
  requesterId: string,
  requesterRole: Role,
): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const report = await prisma.report.findUnique({
    where: { id: reportId, deletedAt: null },
  });

  if (!report) {
    throw new NotFoundError('Report');
  }

  await assertReportAccess(report, requesterId, requesterRole);

  const data = report.generatedData as unknown as ReportGeneratedData;
  if (!data) {
    throw new BadRequestError('Report has no generated data');
  }

  const slug = report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);

  if (format === 'PDF') {
    const buffer = await generatePdf(data);
    return {
      buffer,
      contentType: 'application/pdf',
      filename: `${slug}.pdf`,
    };
  }

  const buffer = generateCsv(data);
  return {
    buffer,
    contentType: 'text/csv',
    filename: `${slug}.csv`,
  };
}
