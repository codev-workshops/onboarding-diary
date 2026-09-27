"use client";

import Link from "next/link";
import { Suspense } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { NoteListView } from "@/features/notes/NoteListView";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";

/** Recruit additional notes (REQ-FUNC-060, 063): list + URL-synced filters (dates, exact tag) + pagination. */
export default function NotesPage() {
  return (
    <RequireRole roles={["NEW_RECRUIT"]}>
      <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="notes-title" style={{ maxWidth: 1000 }}>
        <div className={tableStyles.headerRow}>
          <div>
            <h1 id="notes-title" className={formStyles.title}>
              My notes
            </h1>
            <p className={formStyles.subtitle} style={{ marginBottom: 0 }}>
              Free-form notes about anything else from your onboarding. Tag them to find them again.
            </p>
          </div>
          <Link href="/notes/new" className={formStyles.button} data-testid="new-note">
            New note
          </Link>
        </div>
        <Suspense fallback={null}>
          <NoteListView />
        </Suspense>
      </section>
    </RequireRole>
  );
}
