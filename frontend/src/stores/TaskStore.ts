import type { ApiClient, ListTasksQuery, Task, TaskCategory, TaskCreateRequest, TaskStatus, TaskUpdateRequest } from "@/lib/apiClient";
import { ApiError, TASK_CATEGORIES, TASK_STATUSES } from "@/lib/apiClient";
import { EntryStore, type EntryFilters } from "@/stores/EntryStore";

export interface TaskFilters extends EntryFilters {
  category: TaskCategory | "";
  status: TaskStatus | "";
}

export const DEFAULT_TASK_FILTERS: TaskFilters = { from: "", to: "", category: "", status: "" };
export const DEFAULT_TASK_SORT = "entryDate,desc";

export function isTaskCategory(v: string | null | undefined): v is TaskCategory {
  return v != null && (TASK_CATEGORIES as readonly string[]).includes(v);
}

export function isTaskStatus(v: string | null | undefined): v is TaskStatus {
  return v != null && (TASK_STATUSES as readonly string[]).includes(v);
}

/** User-facing copy for the task error catalog (REQ-FUNC-030..036). */
export function taskErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case "INVALID_STATE_TRANSITION":
        return e.details[0]?.message ? `Status ${e.details[0].message}.` : "That status change is not allowed.";
      case "NOT_FOUND":
        return "This task does not exist or you cannot access it.";
      case "NOT_ASSIGNED":
        return "You are not assigned to this recruit.";
      case "FORBIDDEN":
        return "You are not allowed to do that.";
      case "VALIDATION_FAILED": {
        const fields = e.details.filter((d) => d.field).map((d) => `${d.field} ${d.message}`);
        return fields.length ? `Check the filters: ${fields.join("; ")}.` : e.message;
      }
      default:
        return e.message;
    }
  }
  return e instanceof Error ? e.message : "Something went wrong";
}

/** Task log (REQ-FUNC-030..036) — the reference `EntryStore<T>` implementation. */
export class TaskStore extends EntryStore<Task, TaskCreateRequest, TaskUpdateRequest, TaskFilters, ListTasksQuery> {
  constructor(api: ApiClient) {
    super(api.tasks, DEFAULT_TASK_FILTERS, DEFAULT_TASK_SORT);
  }

  protected override errorMessage(e: unknown): string {
    return taskErrorMessage(e);
  }

  protected filterQuery(filters: TaskFilters): Pick<ListTasksQuery, "category" | "status"> {
    return {
      category: filters.category || undefined,
      status: filters.status || undefined,
    };
  }
}
