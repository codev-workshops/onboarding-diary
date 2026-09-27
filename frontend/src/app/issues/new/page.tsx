"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/navigation";
import { RequireRole } from "@/components/auth/RequireRole";
import { EntryForm } from "@/components/entries/EntryForm";
import { issueFields, issueToFormValues, toCreateRequest, validateIssue } from "@/features/issues/issueForm";
import { useStores } from "@/stores/StoreProvider";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";

const NewIssueForm = observer(function NewIssueForm() {
  const { issues } = useStores();
  const router = useRouter();

  return (
    <EntryForm
      idPrefix="issue"
      fields={issueFields("create")}
      initialValues={issueToFormValues(null)}
      validate={validateIssue}
      submitLabel="Create issue"
      busy={issues.mutating}
      onCancel={() => router.push("/issues")}
      onSubmit={async (values) => {
        const created = await issues.create(toCreateRequest(values));
        router.push(`/issues/${created.id}`);
      }}
    />
  );
});

/** REQ-FUNC-040: create an issue entry (defaults to OPEN). */
export default function NewIssuePage() {
  return (
    <RequireRole roles={["NEW_RECRUIT"]}>
      <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="new-issue-title">
        <p className={tableStyles.muted}>
          <Link href="/issues" className={tableStyles.rowLink}>
            ← Back to issues
          </Link>
        </p>
        <h1 id="new-issue-title" className={formStyles.title}>
          New issue
        </h1>
        <p className={formStyles.subtitle}>Describe the problem and how severe it is. Dates cannot be in the future.</p>
        <NewIssueForm />
      </section>
    </RequireRole>
  );
}
