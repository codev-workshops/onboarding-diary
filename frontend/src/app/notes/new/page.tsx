"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/navigation";
import { RequireRole } from "@/components/auth/RequireRole";
import { NoteForm } from "@/features/notes/NoteForm";
import { noteToFormValues, toCreateRequest } from "@/features/notes/noteForm";
import { useStores } from "@/stores/StoreProvider";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";

const NewNoteForm = observer(function NewNoteForm() {
  const { notes } = useStores();
  const router = useRouter();

  return (
    <NoteForm
      idPrefix="note"
      initialValues={noteToFormValues(null)}
      submitLabel="Create note"
      busy={notes.mutating}
      onCancel={() => router.push("/notes")}
      onSubmit={async (values) => {
        const created = await notes.create(toCreateRequest(values));
        router.push(`/notes/${created.id}`);
      }}
    />
  );
});

/** REQ-FUNC-060/061: create a note with up to 10 normalized tags. */
export default function NewNotePage() {
  return (
    <RequireRole roles={["NEW_RECRUIT"]}>
      <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="new-note-title">
        <p className={tableStyles.muted}>
          <Link href="/notes" className={tableStyles.rowLink}>
            ← Back to notes
          </Link>
        </p>
        <h1 id="new-note-title" className={formStyles.title}>
          New note
        </h1>
        <p className={formStyles.subtitle}>Write down anything worth remembering. Dates cannot be in the future.</p>
        <NewNoteForm />
      </section>
    </RequireRole>
  );
}
