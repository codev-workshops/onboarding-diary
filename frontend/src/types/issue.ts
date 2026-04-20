export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'WONT_FIX';

export interface IssueEntry {
  id: string;
  userId: string;
  date: string;
  title: string;
  description: string;
  severity: Severity;
  status: IssueStatus;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueRequest {
  date: string;
  title: string;
  description: string;
  severity: Severity;
  status?: IssueStatus;
  resolutionNotes?: string;
}

export interface UpdateIssueRequest extends CreateIssueRequest {}
