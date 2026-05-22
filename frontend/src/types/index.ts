export type Role = 'RECRUIT' | 'MANAGER' | 'ADMIN'
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type TaskCategory = 'TRAINING' | 'DOCUMENTATION' | 'MEETING' | 'SETUP' | 'DEVELOPMENT' | 'OTHER'
export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type FeedbackType = 'POSITIVE' | 'SUGGESTION' | 'CONCERN'
export type ReportType = 'TASKS' | 'ISSUES' | 'FEEDBACK' | 'COMBINED'
export type ReportFormat = 'PDF' | 'CSV'

export interface User {
  id: string
  email: string
  fullName: string
  role: Role
  department: string | null
  startDate: string | null
  managerId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: string
  user: User
}

export interface Task {
  id: string
  userId: string
  date: string
  title: string
  description: string | null
  category: TaskCategory
  status: TaskStatus
  priority: TaskPriority
  createdAt: string
  updatedAt: string
}

export interface Issue {
  id: string
  userId: string
  date: string
  title: string
  description: string
  severity: IssueSeverity
  status: IssueStatus
  resolutionNotes: string | null
  createdAt: string
  updatedAt: string
}

export interface Feedback {
  id: string
  userId: string
  date: string
  subject: string
  type: FeedbackType
  details: string
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  userId: string
  date: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface DashboardSummary {
  totalTasks: number
  completedTasks: number
  openIssues: number
  totalFeedback: number
  totalNotes: number
}

export interface DashboardData {
  summary: DashboardSummary
  recentTasks: Task[]
  recentIssues: Issue[]
  recentFeedback: Feedback[]
  recentNotes: Note[]
  taskCompletionRate: number
}

export interface ReportItem {
  id: string
  generatedById: string
  targetUserId: string | null
  dateFrom: string
  dateTo: string
  reportType: ReportType
  format: ReportFormat
  downloadUrl: string
  createdAt: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}
