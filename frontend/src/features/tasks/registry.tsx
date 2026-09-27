"use client";

import type { NavItem } from "@/lib/registry/nav";
import type { RecruitTab, RecruitTabProps } from "@/lib/registry/recruitTabs";
import { TaskListView } from "@/features/tasks/TaskListView";

/** S3 nav entry — recruits only; managers/admins reach tasks through /recruits/{id}. */
export const TASKS_NAV_ITEM: NavItem = { href: "/tasks", label: "Tasks", roles: ["NEW_RECRUIT"], order: 100 };

function RecruitTasksTab({ recruitId }: RecruitTabProps) {
  return (
    <TaskListView
      recruitId={recruitId}
      readOnly
      hrefFor={(taskId) => `/tasks/${taskId}?recruitId=${encodeURIComponent(recruitId)}`}
    />
  );
}

/** S3 read-only Tasks tab on /recruits/{id}. */
export const TASKS_RECRUIT_TAB: RecruitTab = { id: "tasks", label: "Tasks", order: 100, component: RecruitTasksTab };
