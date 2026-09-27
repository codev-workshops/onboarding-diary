"use client";

import Link from "next/link";
import { Suspense } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { TaskListView } from "@/features/tasks/TaskListView";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";

/** Recruit task log (REQ-FUNC-030, 034): list + URL-synced filters + pagination. */
export default function TasksPage() {
  return (
    <RequireRole roles={["NEW_RECRUIT"]}>
      <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="tasks-title" style={{ maxWidth: 1000 }}>
        <div className={tableStyles.headerRow}>
          <div>
            <h1 id="tasks-title" className={formStyles.title}>
              My tasks
            </h1>
            <p className={formStyles.subtitle} style={{ marginBottom: 0 }}>
              Log what you worked on each day and track its status.
            </p>
          </div>
          <Link href="/tasks/new" className={formStyles.button} data-testid="new-task">
            New task
          </Link>
        </div>
        <Suspense fallback={null}>
          <TaskListView />
        </Suspense>
      </section>
    </RequireRole>
  );
}
