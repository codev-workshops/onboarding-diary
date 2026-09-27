"use client";

import type { NavItem } from "@/lib/registry/nav";
import type { RecruitTab, RecruitTabProps } from "@/lib/registry/recruitTabs";
import { NoteListView } from "@/features/notes/NoteListView";

/** S6 nav entry — recruits only; managers/admins reach notes through /recruits/{id}. */
export const NOTES_NAV_ITEM: NavItem = { href: "/notes", label: "Notes", roles: ["NEW_RECRUIT"], order: 400 };

function RecruitNotesTab({ recruitId }: RecruitTabProps) {
  return (
    <NoteListView
      recruitId={recruitId}
      readOnly
      hrefFor={(noteId) => `/notes/${noteId}?recruitId=${encodeURIComponent(recruitId)}`}
    />
  );
}

/** S6 read-only Notes tab on /recruits/{id}. */
export const NOTES_RECRUIT_TAB: RecruitTab = { id: "notes", label: "Notes", order: 400, component: RecruitNotesTab };
