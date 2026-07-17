import type { Role } from './constants';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface User extends CurrentUser {
  startDate: string;
  departmentId: string | null;
  managerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  name: string;
  _count?: { users: number };
}

export interface TaskCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Task {
  id: string;
  date: string;
  title: string;
  description: string;
  categoryId: string;
  category?: TaskCategory;
  status: string;
  priority: string;
  ownerId: string;
  dueDate: string | null;
}

export interface Issue {
  id: string;
  date: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  resolutionNotes: string | null;
  ownerId: string;
}

export interface Feedback {
  id: string;
  date: string;
  subject: string;
  type: string;
  details: string;
  ownerId: string;
}

export interface Note {
  id: string;
  date: string;
  title: string;
  content: string;
  tags: string[];
  ownerId: string;
}

export interface DashboardSummary {
  tasks: {
    total: number;
    completed: number;
    completionRate: number;
    overdue: number;
    byStatus: Record<string, number>;
  };
  issues: { total: number; open: number; bySeverity: Record<string, number> };
  feedback: { total: number };
  notes: { total: number };
  recentEntries: {
    id: string;
    kind: 'task' | 'issue' | 'feedback' | 'note';
    title: string;
    date: string;
    createdAt: string;
  }[];
}

export interface ReportData {
  meta: { start: string; end: string; generatedAt: string; generatedBy: string; scope: string };
  summary: {
    taskTotal: number;
    taskCompleted: number;
    issueTotal: number;
    issueOpen: number;
    feedbackTotal: number;
    noteTotal: number;
  };
  tasks: {
    date: string;
    title: string;
    description: string;
    category: string;
    status: string;
    priority: string;
    owner: string;
  }[];
  issues: {
    date: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    resolutionNotes: string;
    owner: string;
  }[];
  feedback: { date: string; subject: string; type: string; details: string; owner: string }[];
  notes: { date: string; title: string; content: string; tags: string; owner: string }[];
}

export interface AppConfig {
  demoMode: boolean;
  onboardingEnablersEnabled: boolean;
  datasource: 'demo' | 'production';
}

export interface DemoAccount {
  email: string;
  name: string;
  role: Role;
  department: string;
}

export interface DemoCredentials {
  password: string;
  departments: string[];
  accounts: DemoAccount[];
}

export interface TeamRecruitSummary {
  id: string;
  name: string;
  email: string;
  department: string | null;
  taskTotal: number;
  taskCompleted: number;
  completionRate: number;
  overdue: number;
  openIssues: number;
  feedbackTotal: number;
  noteTotal: number;
}

export interface TeamOverview {
  recruits: TeamRecruitSummary[];
  totals: { recruits: number; openIssues: number; completionRate: number; overdue: number };
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  priority: string;
  dueOffsetDays: number;
  categoryId: string | null;
  order: number;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string;
  role: string | null;
  departmentId: string | null;
  department?: { id: string; name: string } | null;
  items: ChecklistItem[];
}

export interface UserRef {
  id: string;
  name: string;
  email: string;
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: UserRef;
  mentions: { id: string; user: UserRef }[];
}

export interface Mention {
  id: string;
  readAt: string | null;
  createdAt: string;
  comment: {
    id: string;
    body: string;
    createdAt: string;
    author: UserRef;
    task: { id: string; title: string };
  };
}

export interface MentionsResponse {
  items: Mention[];
  unread: number;
}
