"use client";

import { useEffect, useRef, type ReactNode } from "react";
import formStyles from "@/components/ui/forms.module.css";
import styles from "./entries.module.css";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal confirmation (delete etc.). Escape / backdrop click cancel; focus lands on Cancel. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  busy,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={() => !busy && onCancel()} data-testid="confirm-backdrop">
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        onClick={(e) => e.stopPropagation()}
        data-testid="confirm-dialog"
      >
        <h2 id="confirm-title" className={styles.dialogTitle}>
          {title}
        </h2>
        <div id="confirm-body" className={styles.dialogBody}>
          {children}
        </div>
        {error && (
          <div className={formStyles.formError} role="alert">
            {error}
          </div>
        )}
        <div className={styles.dialogActions}>
          <button
            ref={cancelRef}
            type="button"
            className={`${formStyles.button} ${formStyles.buttonSecondary}`}
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${formStyles.button} ${danger ? styles.buttonDanger : ""}`}
            onClick={onConfirm}
            disabled={busy}
            data-testid="confirm-accept"
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
