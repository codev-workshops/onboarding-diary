import { apiClient } from './client';

export interface ChecklistItem {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  completedAt: string | null;
  overdue: boolean;
}

export interface ChecklistAssignment {
  id: number;
  templateId: number | null;
  name: string;
  assignedAt: string;
  totalItems: number;
  completedItems: number;
  completionPct: number;
  items: ChecklistItem[];
}

export interface TemplateItem {
  title: string;
  description: string | null;
  dueDayOffset: number | null;
}

export interface ChecklistTemplate {
  id: number;
  name: string;
  description: string | null;
  items: TemplateItem[];
  assignedCount: number;
  updatedAt: string;
  version: number;
}

export interface TemplateRequest {
  name: string;
  description: string | null;
  items: TemplateItem[];
  version?: number;
}

export interface AssignmentSummary {
  id: number;
  recruitId: number;
  recruitName: string | null;
  totalItems: number;
  completedItems: number;
  completionPct: number;
}

export async function fetchMyChecklists(): Promise<ChecklistAssignment[]> {
  const { data } = await apiClient.get<ChecklistAssignment[]>('/checklists');
  return data;
}

export async function setChecklistItem(
  assignmentId: number,
  itemId: number,
  completed: boolean,
): Promise<ChecklistAssignment> {
  const { data } = await apiClient.patch<ChecklistAssignment>(
    `/checklists/${assignmentId}/items/${itemId}`,
    { completed },
  );
  return data;
}

export async function fetchRecruitChecklists(recruitId: number): Promise<ChecklistAssignment[]> {
  const { data } = await apiClient.get<ChecklistAssignment[]>(
    `/manager/recruits/${recruitId}/checklists`,
  );
  return data;
}

const TEMPLATES = '/admin/checklists/templates';

export async function listTemplates(): Promise<ChecklistTemplate[]> {
  const { data } = await apiClient.get<ChecklistTemplate[]>(TEMPLATES);
  return data;
}

export async function createTemplate(body: TemplateRequest): Promise<ChecklistTemplate> {
  const { data } = await apiClient.post<ChecklistTemplate>(TEMPLATES, body);
  return data;
}

export async function updateTemplate(
  id: number,
  body: TemplateRequest,
): Promise<ChecklistTemplate> {
  const { data } = await apiClient.put<ChecklistTemplate>(`${TEMPLATES}/${id}`, body);
  return data;
}

export async function deleteTemplate(id: number): Promise<void> {
  await apiClient.delete(`${TEMPLATES}/${id}`);
}

export async function fetchTemplateAssignments(id: number): Promise<AssignmentSummary[]> {
  const { data } = await apiClient.get<AssignmentSummary[]>(`${TEMPLATES}/${id}/assignments`);
  return data;
}

export async function assignTemplate(
  id: number,
  recruitIds: number[],
): Promise<{ assigned: number[]; skipped: number[] }> {
  const { data } = await apiClient.post<{ assigned: number[]; skipped: number[] }>(
    `${TEMPLATES}/${id}/assignments`,
    { recruitIds },
  );
  return data;
}

export async function unassignChecklist(assignmentId: number): Promise<void> {
  await apiClient.delete(`/admin/checklists/assignments/${assignmentId}`);
}
