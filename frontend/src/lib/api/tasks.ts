import type { ApiTransport, EntryApi, EntryBase, EntryListQuery, Page } from "@/lib/api/core";
import { toQuery } from "@/lib/api/core";

// ---- S3: task log contract (docs/openapi.yaml `Task*`) --------------------------

export const TASK_CATEGORIES = ["TRAINING", "SETUP", "DEVELOPMENT", "MEETING", "DOCUMENTATION", "OTHER"] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/** Allowed status edges (docs/detailed-requirements.md §1.4); the backend enforces them with 422. */
export const TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  TODO: ["IN_PROGRESS", "DONE"],
  IN_PROGRESS: ["BLOCKED", "DONE"],
  BLOCKED: ["IN_PROGRESS", "TODO"],
  DONE: ["IN_PROGRESS"],
};

export interface Task extends EntryBase {
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
}

export interface TaskCreateRequest {
  entryDate: string;
  title: string;
  description?: string | null;
  category: TaskCategory;
  status?: TaskStatus;
  priority?: TaskPriority;
}

export interface TaskUpdateRequest {
  entryDate: string;
  title: string;
  description?: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
}

export interface ListTasksQuery extends EntryListQuery {
  category?: TaskCategory;
  status?: TaskStatus;
}

/** Typed `/tasks` resource; registered once on `ApiClient` as `api.tasks`. */
export class TasksApi implements EntryApi<Task, TaskCreateRequest, TaskUpdateRequest, ListTasksQuery> {
  constructor(private readonly http: ApiTransport) {}

  /** operationId: listTasks */
  list(query: ListTasksQuery = {}): Promise<Page<Task>> {
    return this.http.request<Page<Task>>("GET", `/tasks${toQuery(query)}`);
  }

  /** operationId: createTask */
  create(body: TaskCreateRequest): Promise<Task> {
    return this.http.request<Task>("POST", "/tasks", { body });
  }

  /** operationId: getTask */
  get(taskId: string): Promise<Task> {
    return this.http.request<Task>("GET", `/tasks/${taskId}`);
  }

  /** operationId: updateTask */
  update(taskId: string, body: TaskUpdateRequest): Promise<Task> {
    return this.http.request<Task>("PUT", `/tasks/${taskId}`, { body });
  }

  /** operationId: deleteTask */
  remove(taskId: string): Promise<void> {
    return this.http.request<void>("DELETE", `/tasks/${taskId}`);
  }
}
