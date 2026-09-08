import { apiRequest } from './client';
import type { Paged, Task, TaskCategory } from './tasks';
import { queryString } from './tasks';

export interface ChecklistItem {
  id: number;
  position: number;
  title: string;
  description: string | null;
  category: TaskCategory;
  dueOffsetDays: number | null;
}

export interface ChecklistTemplate {
  id: number;
  name: string;
  description: string | null;
  departmentId: number | null;
  departmentName: string | null;
  isActive: boolean;
  itemCount: number;
  assignmentCount: number;
  createdAt: string;
  updatedAt: string;
  items: ChecklistItem[];
}

export interface ChecklistItemPayload {
  title: string;
  description: string | null;
  category: TaskCategory;
  dueOffsetDays: number | null;
}

export interface ChecklistTemplatePayload {
  name: string;
  description: string | null;
  departmentId: number | null;
  isActive: boolean;
  items: ChecklistItemPayload[];
}

export interface ChecklistTemplateFilters {
  q?: string;
  departmentId?: number | '';
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface AvailableChecklist {
  templateId: number;
  name: string;
  description: string | null;
  itemCount: number;
  applied: boolean;
  assignmentId: number | null;
  items: ChecklistItem[];
}

export interface ChecklistProgress {
  assignmentId: number;
  templateId: number;
  templateName: string;
  appliedAt: string;
  generatedTasks: number;
  completedTasks: number;
  completionPercentage: number;
}

export interface AppliedChecklist {
  progress: ChecklistProgress;
  tasks: Task[];
}

export const listChecklistTemplates = (filters: ChecklistTemplateFilters) =>
  apiRequest<Paged<ChecklistTemplate>>(`/checklist-templates${queryString(filters)}`);

export const createChecklistTemplate = (payload: ChecklistTemplatePayload) =>
  apiRequest<ChecklistTemplate>('/checklist-templates', { method: 'POST', body: payload });

export const updateChecklistTemplate = (id: number, payload: ChecklistTemplatePayload) =>
  apiRequest<ChecklistTemplate>(`/checklist-templates/${id}`, { method: 'PUT', body: payload });

export const deleteChecklistTemplate = (id: number) =>
  apiRequest<void>(`/checklist-templates/${id}`, { method: 'DELETE' });

export const listAvailableChecklists = () =>
  apiRequest<AvailableChecklist[]>('/checklist-templates/available');

export const applyChecklist = (templateId: number) =>
  apiRequest<AppliedChecklist>('/checklists/apply', { method: 'POST', body: { templateId } });

export const listChecklistProgress = (userId?: number) =>
  apiRequest<ChecklistProgress[]>(
    `/checklists/progress${userId === undefined ? '' : `?userId=${userId}`}`
  );
