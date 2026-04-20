export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ErrorResponse {
  status: number;
  message: string;
  fieldErrors?: Record<string, string>;
  timestamp: string;
}

export interface DashboardResponse {
  totalTasks: number;
  completedTasks: number;
  openIssues: number;
  feedbackCount: number;
  notesCount: number;
  recentTasks: unknown[];
  recentIssues: unknown[];
  tasksByCategory: Record<string, number>;
  tasksByStatus: Record<string, number>;
  issuesBySeverity: Record<string, number>;
}
