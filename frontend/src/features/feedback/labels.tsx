import type { Feedback, FeedbackType } from "@/lib/apiClient";
import { FEEDBACK_TYPES } from "@/lib/apiClient";
import type { SelectOption } from "@/components/entries/FilterBar";
import { formatDateOnly } from "@/components/ui/labels";
import styles from "@/components/entries/entries.module.css";
import feedbackStyles from "@/features/feedback/feedback.module.css";

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  POSITIVE: "Positive",
  SUGGESTION: "Suggestion",
  CONCERN: "Concern",
};

export const FEEDBACK_TYPE_OPTIONS: SelectOption[] = FEEDBACK_TYPES.map((t) => ({ value: t, label: FEEDBACK_TYPE_LABELS[t] }));

const TYPE_CLASS: Record<FeedbackType, string> = {
  POSITIVE: styles.tagDone,
  SUGGESTION: styles.tagInProgress,
  CONCERN: styles.tagHigh,
};

export function FeedbackTypeTag({ type }: { type: FeedbackType }) {
  return (
    <span className={`${styles.tag} ${TYPE_CLASS[type]}`} data-testid={`feedback-type-${type}`}>
      {FEEDBACK_TYPE_LABELS[type]}
    </span>
  );
}

/** D3 notice shown on every feedback screen. */
export function FeedbackVisibilityNotice({ audience }: { audience: "recruit" | "viewer" }) {
  return (
    <p className={feedbackStyles.notice} role="note" data-testid="feedback-visibility-notice">
      {audience === "recruit"
        ? "Private to you, your current manager and administrators. When you are reassigned, your previous manager loses access."
        : "Sensitive: visible only because you are this recruit's current manager or an administrator."}
    </p>
  );
}

/** Card body used by the /feedback list and the recruit Feedback tab. */
export function FeedbackCard({ note }: { note: Feedback }) {
  return (
    <>
      <div className={styles.itemHead}>
        <span className={styles.itemTitle}>{note.subject}</span>
        <span className={styles.itemMeta} style={{ marginTop: 0 }}>
          {formatDateOnly(note.entryDate)}
        </span>
      </div>
      <div className={styles.itemMeta}>
        <FeedbackTypeTag type={note.type} />
      </div>
      <p className={styles.itemBody}>{note.details}</p>
    </>
  );
}
