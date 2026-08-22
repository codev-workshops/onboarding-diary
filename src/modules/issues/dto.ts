import type { IssueSeverity, IssueStatus, Prisma } from '@prisma/client';

/** Owner by name only; SEC-18 keeps other users' emails out of manager payloads. */
export const issueSelect = {
  id: true,
  ownerId: true,
  entryDate: true,
  title: true,
  description: true,
  severity: true,
  status: true,
  resolutionNotes: true,
  resolvedAt: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, fullName: true } },
  updatedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.IssueEntrySelect;

export type IssueRow = Prisma.IssueEntryGetPayload<{ select: typeof issueSelect }>;

export type IssueDto = {
  id: string;
  owner: { id: string; full_name: string };
  entry_date: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  updated_by: { id: string; full_name: string };
};

export function toIssueDto(issue: IssueRow): IssueDto {
  return {
    id: issue.id,
    owner: { id: issue.owner.id, full_name: issue.owner.fullName },
    entry_date: issue.entryDate.toISOString().slice(0, 10),
    title: issue.title,
    description: issue.description,
    severity: issue.severity,
    status: issue.status,
    resolution_notes: issue.resolutionNotes,
    resolved_at: issue.resolvedAt?.toISOString() ?? null,
    version: issue.version,
    created_at: issue.createdAt.toISOString(),
    updated_at: issue.updatedAt.toISOString(),
    updated_by: { id: issue.updatedBy.id, full_name: issue.updatedBy.fullName },
  };
}
