"use client";

import { observer } from "mobx-react-lite";
import { useEffect, useState, type FormEvent } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { FormField } from "@/components/ui/FormField";
import styles from "@/components/ui/forms.module.css";
import type { FormErrors, UserProfile } from "@/lib/apiClient";
import { EMPTY_ERRORS, toFormErrors } from "@/lib/formErrors";
import { useStores } from "@/stores/StoreProvider";

const ROLE_LABELS = { NEW_RECRUIT: "New recruit", MANAGER: "Manager", ADMIN: "Admin" } as const;

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString() : "—";
}

const ProfileDetails = observer(function ProfileDetails({ user }: { user: UserProfile }) {
  return (
    <section className={`${styles.card} ${styles.wide}`} aria-labelledby="profile-title">
      <h1 id="profile-title" className={styles.title}>
        {user.fullName}
      </h1>
      <p className={styles.subtitle}>{user.email}</p>
      <dl className={styles.dl}>
        <dt>Role</dt>
        <dd data-testid="profile-role">{ROLE_LABELS[user.role]}</dd>
        <dt>Status</dt>
        <dd>{user.status}</dd>
        <dt>Department</dt>
        <dd data-testid="profile-department">{user.department ?? "—"}</dd>
        <dt>Start date</dt>
        <dd data-testid="profile-start-date">{user.startDate ?? "—"}</dd>
        <dt>Invited</dt>
        <dd>
          {formatDate(user.invitedAt)}
          {user.createdBy ? ` by ${user.createdBy.fullName}` : ""}
        </dd>
        <dt>Activated</dt>
        <dd>{formatDate(user.activatedAt)}</dd>
      </dl>
    </section>
  );
});

const EditProfileForm = observer(function EditProfileForm({ user }: { user: UserProfile }) {
  const { auth } = useStores();
  const [fullName, setFullName] = useState(user.fullName);
  const [errors, setErrors] = useState<FormErrors>(EMPTY_ERRORS);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSaved(false);
    setErrors(EMPTY_ERRORS);
    try {
      await auth.updateProfile({ fullName: fullName.trim() });
      setSaved(true);
    } catch (err) {
      setErrors(toFormErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={`${styles.card} ${styles.wide}`} aria-labelledby="edit-title">
      <h2 id="edit-title" className={styles.title}>
        Edit profile
      </h2>
      <p className={styles.subtitle}>
        Department and start date are set by your administrator.
      </p>
      <form className={styles.form} onSubmit={(e) => void onSubmit(e)} noValidate>
        {errors.form && (
          <div className={styles.formError} role="alert">
            {errors.form}
          </div>
        )}
        {saved && (
          <div className={styles.formSuccess} role="status">
            Profile saved.
          </div>
        )}
        <FormField
          id="edit-fullName"
          label="Full name"
          maxLength={100}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fields.fullName}
          required
        />
        <div className={styles.actions}>
          <button type="submit" className={styles.button} disabled={submitting}>
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
});

const ChangePasswordForm = observer(function ChangePasswordForm() {
  const { auth } = useStores();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FormErrors>(EMPTY_ERRORS);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setDone(false);
    if (newPassword !== confirm) {
      setErrors({ fields: { confirmPassword: "Passwords do not match." } });
      return;
    }
    setSubmitting(true);
    setErrors(EMPTY_ERRORS);
    try {
      await auth.changePassword({ currentPassword, newPassword });
      setDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      const mapped = toFormErrors(err);
      // INVALID_CURRENT_PASSWORD carries no field detail; show it on the field it concerns.
      if (mapped.form && !mapped.fields.currentPassword && /current/i.test(mapped.form)) {
        mapped.fields.currentPassword = mapped.form;
        mapped.form = undefined;
      }
      setErrors(mapped);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={`${styles.card} ${styles.wide}`} aria-labelledby="password-title">
      <h2 id="password-title" className={styles.title}>
        Change password
      </h2>
      <form className={styles.form} onSubmit={(e) => void onSubmit(e)} noValidate>
        {errors.form && (
          <div className={styles.formError} role="alert">
            {errors.form}
          </div>
        )}
        {done && (
          <div className={styles.formSuccess} role="status">
            Password changed.
          </div>
        )}
        <FormField
          id="currentPassword"
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          error={errors.fields.currentPassword}
          required
        />
        <div className={styles.row}>
          <FormField
            id="newPassword"
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="10–128 characters with at least one letter and one digit."
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.fields.newPassword}
            required
          />
          <FormField
            id="confirmPassword"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.fields.confirmPassword}
            required
          />
        </div>
        <div className={styles.actions}>
          <button type="submit" className={styles.button} disabled={submitting}>
            {submitting ? "Updating…" : "Change password"}
          </button>
        </div>
      </form>
    </section>
  );
});

const ProfileContent = observer(function ProfileContent() {
  const { auth } = useStores();

  useEffect(() => {
    void auth.refreshProfile().catch(() => undefined);
  }, [auth]);

  if (!auth.user) return null;
  return (
    <div className={styles.stack}>
      <ProfileDetails user={auth.user} />
      <EditProfileForm key={auth.user.updatedAt} user={auth.user} />
      <ChangePasswordForm />
    </div>
  );
});

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}
