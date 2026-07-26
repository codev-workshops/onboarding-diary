import type {
  FeedbackNoteDto,
  IssueEntryDto,
  NoteDto,
  TaskEntryDto,
} from '@onboarding-diary/shared';

import type { FeedbackNote, IssueEntry, Note, TaskEntry } from '../generated/prisma/client.js';

function calendarDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function toTaskDto(task: TaskEntry): TaskEntryDto {
  return {
    id: task.id,
    ownerId: task.ownerId,
    entryDate: calendarDate(task.entryDate),
    title: task.title,
    description: task.description,
    category: task.category,
    status: task.status,
    priority: task.priority,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function toIssueDto(issue: IssueEntry): IssueEntryDto {
  return {
    id: issue.id,
    ownerId: issue.ownerId,
    entryDate: calendarDate(issue.entryDate),
    title: issue.title,
    description: issue.description,
    severity: issue.severity,
    status: issue.status,
    resolutionNotes: issue.resolutionNotes,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  };
}

export function toFeedbackDto(feedback: FeedbackNote): FeedbackNoteDto {
  return {
    id: feedback.id,
    ownerId: feedback.ownerId,
    entryDate: calendarDate(feedback.entryDate),
    subject: feedback.subject,
    type: feedback.type,
    details: feedback.details,
    createdAt: feedback.createdAt.toISOString(),
    updatedAt: feedback.updatedAt.toISOString(),
  };
}

export type NoteWithTags = Note & { tags: { tag: { name: string } }[] };

export function toNoteDto(note: NoteWithTags): NoteDto {
  return {
    id: note.id,
    ownerId: note.ownerId,
    entryDate: calendarDate(note.entryDate),
    title: note.title,
    content: note.content,
    tags: note.tags.map((join) => join.tag.name).sort(),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

export { calendarDate as toCalendarDateString };
