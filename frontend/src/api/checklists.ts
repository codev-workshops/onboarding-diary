import type { UserRef } from './types';

export interface ChecklistTemplate {
  id: number;
  name: string;
  items: string[];
  createdBy: UserRef | null;
}

export interface ChecklistItem {
  id: number;
  label: string;
  done: boolean;
  doneAt: string | null;
}

export interface Checklist {
  id: number;
  name: string;
  assignedBy: UserRef | null;
  assignedAt: string;
  done: number;
  total: number;
  items: ChecklistItem[];
}
