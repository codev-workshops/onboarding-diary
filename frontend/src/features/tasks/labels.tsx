import type { Task, TaskCategory, TaskPriority, TaskStatus } from "@/lib/apiClient";
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES } from "@/lib/apiClient";
import type { SelectOption } from "@/components/entries/FilterBar";
import { formatDateOnly } from "@/components/ui/labels";
import styles from "@/components/entries/entries.module.css";

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  TRAINING: "Training",
  SETUP: "Setup",
  DEVELOPMENT: "Development",
  MEETING: "Meeting",
  DOCUMENTATION: "Documentation",
  OTHER: "Other",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const CATEGORY_OPTIONS: SelectOption[] = TASK_CATEGORIES.map((c) => ({ value: c, label: TASK_CATEGORY_LABELS[c] }));
export const STATUS_OPTIONS: SelectOption[] = TASK_STATUSES.map((s) => ({ value: s, label: TASK_STATUS_LABELS[s] }));
export const PRIORITY_OPTIONS: SelectOption[] = TASK_PRIORITIES.map((p) => ({ value: p, label: TASK_PRIORITY_LABELS[p] }));

const STATUS_CLASS: Record<TaskStatus, string> = {
  TODO: styles.tagTodo,
  IN_PROGRESS: styles.tagInProgress,
  BLOCKED: styles.tagBlocked,
  DONE: styles.tagDone,
};

export function TaskStatusTag({ status }: { status: TaskStatus }) {
  return (
    <span className={`${styles.tag} ${STATUS_CLASS[status]}`} data-testid={`task-status-${status}`}>
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}

export function TaskPriorityTag({ priority }: { priority: TaskPriority }) {
  const cls = priority === "HIGH" ? styles.tagHigh : priority === "LOW" ? styles.tagLow : "";
  return (
    <span className={`${styles.tag} ${cls}`} data-testid={`task-priority-${priority}`}>
      {TASK_PRIORITY_LABELS[priority]} priority
    </span>
  );
}

/** Card body used by the /tasks list and the recruit Tasks tab. */
export function TaskCard({ task }: { task: Task }) {
  return (
    <>
      <div className={styles.itemHead}>
        <span className={styles.itemTitle}>{task.title}</span>
        <span className={styles.itemMeta} style={{ marginTop: 0 }}>
          {formatDateOnly(task.entryDate)}
        </span>
      </div>
      <div className={styles.itemMeta}>
        <TaskStatusTag status={task.status} />
        <TaskPriorityTag priority={task.priority} />
        <span className={styles.tag}>{TASK_CATEGORY_LABELS[task.category]}</span>
      </div>
      {task.description && <p className={styles.itemBody}>{task.description}</p>}
    </>
  );
}
