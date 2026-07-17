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
  tasks: { total: number; completed: number; completionRate: number; byStatus: Record<string, number> };
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
