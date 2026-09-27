"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/navigation";
import { RequireRole } from "@/components/auth/RequireRole";
import { EntryForm } from "@/components/entries/EntryForm";
import { feedbackFields, feedbackToFormValues, toCreateRequest, validateFeedback } from "@/features/feedback/feedbackForm";
import { FeedbackVisibilityNotice } from "@/features/feedback/labels";
import { useStores } from "@/stores/StoreProvider";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";

const NewFeedbackForm = observer(function NewFeedbackForm() {
  const { feedback } = useStores();
  const router = useRouter();

  return (
    <EntryForm
      idPrefix="feedback"
      fields={feedbackFields()}
      initialValues={feedbackToFormValues(null)}
      validate={validateFeedback}
      submitLabel="Share feedback"
      busy={feedback.mutating}
      onCancel={() => router.push("/feedback")}
      onSubmit={async (values) => {
        const created = await feedback.create(toCreateRequest(values));
        router.push(`/feedback/${created.id}`);
      }}
    />
  );
});

/** REQ-FUNC-050: create a feedback note. */
export default function NewFeedbackPage() {
  return (
    <RequireRole roles={["NEW_RECRUIT"]}>
      <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="new-feedback-title">
        <p className={tableStyles.muted}>
          <Link href="/feedback" className={tableStyles.rowLink}>
            ← Back to feedback
          </Link>
        </p>
        <h1 id="new-feedback-title" className={formStyles.title}>
          New feedback
        </h1>
        <p className={formStyles.subtitle}>Tell us what is going well or what should change. Dates cannot be in the future.</p>
        <FeedbackVisibilityNotice audience="recruit" />
        <NewFeedbackForm />
      </section>
    </RequireRole>
  );
}
