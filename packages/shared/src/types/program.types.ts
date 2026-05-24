import type { IssueSeverity, IssueStatus, Visibility } from '../enums';

export interface IssueEntryDto {
  id: string;
  user_id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  resolution_note: string | null;
  resolved_at: string | null;
  visibility: Visibility;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateIssueEntryInput {
  title: string;
  description: string;
  severity?: IssueSeverity;
  visibility?: Visibility;
  tags?: string[];
}

export interface UpdateIssueEntryInput {
  title?: string;
  description?: string;
  severity?: IssueSeverity;
  status?: IssueStatus;
  resolution_note?: string;
  visibility?: Visibility;
  tags?: string[];
}
