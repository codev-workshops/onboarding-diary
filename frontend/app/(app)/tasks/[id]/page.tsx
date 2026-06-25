"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProtectedRoute } from "@/lib/protected-route";
import { getTask, updateTask, type TaskDto, type UpdateTaskRequest } from "@/lib/api";
import styles from "../tasks.module.css";

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

interface FormErrors {
  title?: string;
  description?: string;
  date?: string;
}

function TaskDetailContent() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [task, setTask] = useState<TaskDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Training");
  const [status, setStatus] = useState("NotStarted");
  const [priority, setPriority] = useState("Medium");

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await getTask(id);
        setTask(res.task);
        setDate(res.task.date.slice(0, 10));
        setTitle(res.task.title);
        setDescription(res.task.description ?? "");
        setCategory(res.task.category);
        setStatus(res.task.status);
        setPriority(res.task.priority);
      } catch {
        showToast("Task not found.", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, showToast]);

  async function handleSave() {
    const errs: FormErrors = {};
    if (!title.trim()) errs.title = "Title is required.";
    else if (title.trim().length < 3) errs.title = "Title must be at least 3 characters.";
    else if (title.trim().length > 100) errs.title = "Title must be at most 100 characters.";
    if (title !== title.trim()) errs.title = "Title must not have leading or trailing whitespace.";
    if (description && description.length > 2000) errs.description = "Description must be at most 2000 characters.";
    if (status === "Completed" && !description.trim()) errs.description = "Description is required when status is Completed.";
    if (!date) errs.date = "Date is required.";
    else if (date > todayStr()) errs.date = "Date must not be in the future.";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const payload: UpdateTaskRequest = {
        date: new Date(date).toISOString(),
        title: title.trim(),
        description: description.trim() || null,
        category,
        status,
        priority,
      };
      await updateTask(id, payload);
      showToast("Task updated successfully.", "success");
      setTimeout(() => router.push("/tasks"), 800);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update task.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.container}><p className={styles.empty}>Loading...</p></div>;
  if (!task) return <div className={styles.container}><p className={styles.empty}>Task not found.</p></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Edit Task</h1>
        <button className={styles.cancelBtn} onClick={() => router.push("/tasks")}>Back to Tasks</button>
      </div>

      <div className={styles.modal} style={{ border: "none", maxWidth: "100%" }}>
        <div className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="taskDate">Date</label>
            <input id="taskDate" type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
            {formErrors.date && <p className={styles.fieldError}>{formErrors.date}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor="taskTitle">Title</label>
            <input id="taskTitle" type="text" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
            {formErrors.title && <p className={styles.fieldError}>{formErrors.title}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor="taskDesc">Description</label>
            <textarea id="taskDesc" maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
            {formErrors.description && <p className={styles.fieldError}>{formErrors.description}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor="taskCategory">Category</label>
            <select id="taskCategory" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="taskStatus">Status</label>
            <select id="taskStatus" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="taskPriority">Priority</label>
            <select id="taskPriority" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className={styles.formActions}>
            <button className={styles.cancelBtn} type="button" onClick={() => router.push("/tasks")}>Cancel</button>
            <button className={styles.saveBtn} type="button" disabled={saving} onClick={handleSave}>
              {saving ? "Saving..." : "Update"}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function TaskDetailPage() {
  return (
    <ProtectedRoute>
      <TaskDetailContent />
    </ProtectedRoute>
  );
}
