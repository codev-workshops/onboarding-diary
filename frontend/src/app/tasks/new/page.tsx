"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/navigation";
import { RequireRole } from "@/components/auth/RequireRole";
import { EntryForm } from "@/components/entries/EntryForm";
import { taskFields, taskToFormValues, toCreateRequest, validateTask } from "@/features/tasks/taskForm";
import { useStores } from "@/stores/StoreProvider";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";

const NewTaskForm = observer(function NewTaskForm() {
  const { tasks } = useStores();
  const router = useRouter();

  return (
    <EntryForm
      idPrefix="task"
      fields={taskFields("create")}
      initialValues={taskToFormValues(null)}
      validate={validateTask}
      submitLabel="Create task"
      busy={tasks.mutating}
      onCancel={() => router.push("/tasks")}
      onSubmit={async (values) => {
        const created = await tasks.create(toCreateRequest(values));
        router.push(`/tasks/${created.id}`);
      }}
    />
  );
});

/** REQ-FUNC-030: create a task entry (defaults TODO / MEDIUM). */
export default function NewTaskPage() {
  return (
    <RequireRole roles={["NEW_RECRUIT"]}>
      <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="new-task-title">
        <p className={tableStyles.muted}>
          <Link href="/tasks" className={tableStyles.rowLink}>
            ← Back to tasks
          </Link>
        </p>
        <h1 id="new-task-title" className={formStyles.title}>
          New task
        </h1>
        <p className={formStyles.subtitle}>Record something you worked on. Dates cannot be in the future.</p>
        <NewTaskForm />
      </section>
    </RequireRole>
  );
}
