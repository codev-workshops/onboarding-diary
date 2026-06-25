"use client";

import { useCallback, useEffect, useState } from "react";
import { ProtectedRoute } from "@/lib/protected-route";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  type TaskDto,
  type CreateTaskRequest,
  type UpdateTaskRequest,
  type TaskListParams,
} from "@/lib/api";
import styles from "./tasks.module.css";

const CATEGORIES = ["Training", "Documentation", "Setup", "Meeting", "Shadowing", "Other"] as const;
const STATUSES = ["NotStarted", "InProgress", "Completed", "Blocked"] as const;
const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;

const STATUS_LABELS: Record<string, string> = {
  NotStarted: "Not Started",
  InProgress: "In Progress",
  Completed: "Completed",
  Blocked: "Blocked",
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface TaskFormData {
  date: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
}

function emptyForm(): TaskFormData {
  return { date: todayStr(), title: "", description: "", category: "Training", status: "NotStarted", priority: "Medium" };
}

interface FormErrors {
  title?: string;
  description?: string;
  date?: string;
}

function validateForm(data: TaskFormData): FormErrors {
  const errs: FormErrors = {};
  if (!data.title.trim()) errs.title = "Title is required.";
  else if (data.title.trim().length < 3) errs.title = "Title must be at least 3 characters.";
  else if (data.title.trim().length > 100) errs.title = "Title must be at most 100 characters.";
  if (data.title !== data.title.trim()) errs.title = "Title must not have leading or trailing whitespace.";
  if (data.description && data.description.length > 2000) errs.description = "Description must be at most 2000 characters.";
  if (data.status === "Completed" && !data.description.trim()) errs.description = "Description is required when status is Completed.";
  if (!data.date) errs.date = "Date is required.";
  else if (data.date > todayStr()) errs.date = "Date must not be in the future.";
  return errs;
}

function statusBadgeClass(status: string): string {
  if (status === "Completed") return `${styles.badge} ${styles.badgeStatusCompleted}`;
  if (status === "Blocked") return `${styles.badge} ${styles.badgeStatusBlocked}`;
  return `${styles.badge} ${styles.badgeStatus}`;
}

function priorityBadgeClass(priority: string): string {
  if (priority === "Urgent") return `${styles.badge} ${styles.badgePriorityUrgent}`;
  if (priority === "High") return `${styles.badge} ${styles.badgePriorityHigh}`;
  return `${styles.badge} ${styles.badgeStatus}`;
}

function TasksContent() {
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(emptyForm());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params: TaskListParams = { page, limit: 20 };
        if (filterCategory) params.category = filterCategory;
        if (filterStatus) params.status = filterStatus;
        if (filterPriority) params.priority = filterPriority;
        if (filterStartDate) params.startDate = filterStartDate;
        if (filterEndDate) params.endDate = filterEndDate;
        const res = await listTasks(params);
        if (!cancelled) {
          setTasks(res.tasks);
          setTotalPages(res.totalPages);
          setTotal(res.total);
        }
      } catch (err) {
        if (!cancelled) {
          showToast(err instanceof Error ? err.message : "Failed to load tasks.", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [page, filterCategory, filterStatus, filterPriority, filterStartDate, filterEndDate, showToast, refreshKey]);

  function openCreate() {
    setEditingTask(null);
    setFormData(emptyForm());
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(task: TaskDto) {
    setEditingTask(task);
    setFormData({
      date: task.date.slice(0, 10),
      title: task.title,
      description: task.description ?? "",
      category: task.category,
      status: task.status,
      priority: task.priority,
    });
    setFormErrors({});
    setModalOpen(true);
  }

  async function handleSave() {
    const errs = validateForm(formData);
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const payload: CreateTaskRequest | UpdateTaskRequest = {
        date: new Date(formData.date).toISOString(),
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        status: formData.status,
        priority: formData.priority,
      };

      if (editingTask) {
        await updateTask(editingTask.id, payload);
        showToast("Task updated successfully.", "success");
      } else {
        await createTask(payload);
        showToast("Task created successfully.", "success");
      }

      setModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save task.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteTask(id);
      showToast("Task deleted.", "success");
      setDeleteConfirm(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete task.", "error");
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Task Log</h1>
        <button className={styles.newBtn} onClick={openCreate}>
          + New Task
        </button>
      </div>

      <div className={styles.filters}>
        <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}>
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input type="date" value={filterStartDate} onChange={(e) => { setFilterStartDate(e.target.value); setPage(1); }} placeholder="Start date" />
        <input type="date" value={filterEndDate} onChange={(e) => { setFilterEndDate(e.target.value); setPage(1); }} placeholder="End date" />
      </div>

      {loading ? (
        <p className={styles.empty}>Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className={styles.empty}>No tasks found. Click &quot;+ New Task&quot; to create one.</p>
      ) : (
        <>
          <div className={styles.taskList}>
            {tasks.map((task) => (
              <div key={task.id} className={styles.taskCard}>
                <div className={styles.taskCardHeader}>
                  <div>
                    <span className={styles.taskTitle}>{task.title}</span>
                    <span className={styles.taskDate}> &mdash; {new Date(task.date).toLocaleDateString()}</span>
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.editBtn} onClick={() => openEdit(task)}>Edit</button>
                    {deleteConfirm === task.id ? (
                      <>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(task.id)}>Confirm</button>
                        <button className={styles.editBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className={styles.deleteBtn} onClick={() => setDeleteConfirm(task.id)}>Delete</button>
                    )}
                  </div>
                </div>
                <div className={styles.badges}>
                  <span className={`${styles.badge} ${styles.badgeCategory}`}>{task.category}</span>
                  <span className={statusBadgeClass(task.status)}>{STATUS_LABELS[task.status] ?? task.status}</span>
                  <span className={priorityBadgeClass(task.priority)}>{task.priority}</span>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {totalPages} ({total} tasks)</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {modalOpen && (
        <div className={styles.overlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2>{editingTask ? "Edit Task" : "New Task"}</h2>
            <div className={styles.form}>
              <div className={styles.field}>
                <label htmlFor="taskDate">Date</label>
                <input id="taskDate" type="date" value={formData.date} max={todayStr()} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                {formErrors.date && <p className={styles.fieldError}>{formErrors.date}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="taskTitle">Title</label>
                <input id="taskTitle" type="text" maxLength={100} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Task title (3-100 chars)" />
                {formErrors.title && <p className={styles.fieldError}>{formErrors.title}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="taskDesc">Description</label>
                <textarea id="taskDesc" maxLength={2000} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description (max 2000 chars)" />
                {formErrors.description && <p className={styles.fieldError}>{formErrors.description}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="taskCategory">Category</label>
                <select id="taskCategory" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="taskStatus">Status</label>
                <select id="taskStatus" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="taskPriority">Priority</label>
                <select id="taskPriority" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className={styles.formActions}>
                <button className={styles.cancelBtn} type="button" onClick={() => setModalOpen(false)}>Cancel</button>
                <button className={styles.saveBtn} type="button" disabled={saving} onClick={handleSave}>
                  {saving ? "Saving..." : editingTask ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <TasksContent />
    </ProtectedRoute>
  );
}
