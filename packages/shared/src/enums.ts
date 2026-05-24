export enum Role {
  RECRUIT = 'RECRUIT',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  INVITED = 'INVITED',
}

export enum Visibility {
  PRIVATE = 'PRIVATE',
  MANAGER_ONLY = 'MANAGER_ONLY',
  PUBLIC = 'PUBLIC',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
}

export enum IssueSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IssueStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum FeedbackType {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  CONSTRUCTIVE = 'CONSTRUCTIVE',
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  GENERATED = 'GENERATED',
  REVIEWED = 'REVIEWED',
  ARCHIVED = 'ARCHIVED',
}

export enum ReportType {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  FINAL = 'FINAL',
  CUSTOM = 'CUSTOM',
}
