export type UserRole = 'NewRecruit' | 'Manager' | 'Admin';

export type TaskCategory = 'Training' | 'Setup' | 'Documentation' | 'Meeting' | 'Development' | 'Other';
export type TaskStatus = 'NotStarted' | 'InProgress' | 'Blocked' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type IssueSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';
export type FeedbackType = 'Positive' | 'Suggestion' | 'Concern';

export const taskCategories: TaskCategory[] = ['Training', 'Setup', 'Documentation', 'Meeting', 'Development', 'Other'];
export const taskStatuses: TaskStatus[] = ['NotStarted', 'InProgress', 'Blocked', 'Completed'];
export const taskPriorities: TaskPriority[] = ['Low', 'Medium', 'High'];
export const issueSeverities: IssueSeverity[] = ['Low', 'Medium', 'High', 'Critical'];
export const issueStatuses: IssueStatus[] = ['Open', 'InProgress', 'Resolved', 'Closed'];
export const feedbackTypes: FeedbackType[] = ['Positive', 'Suggestion', 'Concern'];

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  department?: string | null;
  startDate: string;
  managerId?: number | null;
  managerName?: string | null;
}

export interface AuthResponse {
  token: string;
  expiresAtUtc: string;
  user: User;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface EntryBase {
  id: number;
  userId: number;
  userName: string;
  date: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface TaskEntry extends EntryBase {
  title: string;
  description?: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
}

export interface IssueEntry extends EntryBase {
  title: string;
  description?: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  resolutionNotes?: string | null;
}

export interface FeedbackEntry extends EntryBase {
  subject: string;
  type: FeedbackType;
  details?: string | null;
}

export interface NoteEntry extends EntryBase {
  title: string;
  content?: string | null;
  tags: string[];
}

export type JourneyStageStatus = 'NotStarted' | 'InProgress' | 'Blocked' | 'Completed';
export type ChecklistState = 'Completed' | 'InProgress' | 'Pending';

export interface JourneyStage {
  key: string;
  label: string;
  total: number;
  notStarted: number;
  inProgress: number;
  blocked: number;
  completed: number;
  completionPercent: number;
  status: JourneyStageStatus;
  firstActivityDate?: string | null;
  lastActivityDate?: string | null;
  dayOffset: number;
}

export interface ChecklistItem {
  id: number;
  title: string;
  category: TaskCategory;
  date: string;
  state: ChecklistState;
  isBlocked: boolean;
}

export interface Checklist {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  progressPercent: number;
  items: ChecklistItem[];
}

export interface DashboardSummary {
  recruitId: number;
  recruitName: string;
  taskCounts: { total: number; notStarted: number; inProgress: number; blocked: number; completed: number };
  taskCompletionPercent: number;
  issueCounts: { total: number; open: number; inProgress: number; resolved: number; closed: number };
  feedbackCounts: { total: number; positive: number; suggestion: number; concern: number };
  notesCount: number;
  recentActivity: { type: string; id: number; title: string; date: string; status?: string | null }[];
  startDate: string;
  journey: { startDate: string; daysSinceStart: number; stages: JourneyStage[] };
  checklist: Checklist;
}

export interface RecruitProgress {
  recruitId: number;
  recruitName: string;
  department?: string | null;
  startDate: string;
  taskTotal: number;
  taskCompleted: number;
  taskCompletionPercent: number;
  openIssues: number;
}

export interface ManagerDashboard {
  recruitCount: number;
  recruits: RecruitProgress[];
  openIssuesBySeverity: { low: number; medium: number; high: number; critical: number };
  feedbackCounts: { total: number; positive: number; suggestion: number; concern: number };
  totals: { tasks: number; completedTasks: number; openIssues: number; notes: number };
}

export interface LabelCount {
  label: string;
  count: number;
}

export interface AdminDashboard {
  userCount: number;
  usersByRole: LabelCount[];
  usersByDepartment: LabelCount[];
  activityByWeek: { weekStartDate: string; tasks: number; issues: number; feedback: number; notes: number }[];
  totals: { tasks: number; issues: number; feedback: number; notes: number };
}

export interface ApiErrorBody {
  error: { code: string; message: string; details: string[] };
}
