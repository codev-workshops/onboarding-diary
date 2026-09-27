"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { AssignmentPanel } from "@/components/admin/AssignmentPanel";
import { RequireRole } from "@/components/auth/RequireRole";
import { FormField } from "@/components/ui/FormField";
import { ROLES, ROLE_LABELS, StatusBadge, formatDateTime } from "@/components/ui/labels";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";
import type { AdminUserUpdateRequest, FormErrors, Role, UserDetail } from "@/lib/apiClient";
import { EMPTY_ERRORS, toFormErrors } from "@/lib/formErrors";
import { useStores } from "@/stores/StoreProvider";

const UserHeader = observer(function UserHeader({ user }: { user: UserDetail }) {
  const { admin, auth } = useStores();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isSelf = auth.user?.id === user.id;

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      if (user.status === "DEACTIVATED") await admin.reactivateUser(user.id);
      else await admin.deactivateUser(user.id);
    } catch (e) {
      setError(toFormErrors(e).form ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="user-title">
      <div className={tableStyles.headerRow}>
        <div>
          <h1 id="user-title" className={formStyles.title}>
            {user.fullName}
          </h1>
          <p className={formStyles.subtitle} style={{ marginBottom: 0 }}>
            {user.email} · {ROLE_LABELS[user.role]} · <StatusBadge status={user.status} />
          </p>
        </div>
        <div className={formStyles.actions}>
          <Link href="/admin/users" className={`${formStyles.button} ${formStyles.buttonSecondary}`}>
            Back to users
          </Link>
          <button
            type="button"
            className={`${formStyles.button} ${user.status === "DEACTIVATED" ? "" : formStyles.buttonSecondary}`}
            onClick={() => void toggle()}
            disabled={busy}
            data-testid="toggle-status"
            title={isSelf ? "You cannot deactivate your own account" : undefined}
          >
            {user.status === "DEACTIVATED" ? "Reactivate" : "Deactivate"}
          </button>
        </div>
      </div>
      {error && (
        <div className={formStyles.formError} role="alert" data-testid="status-error">
          {error}
        </div>
      )}
      <dl className={formStyles.dl} style={{ marginTop: "0.75rem" }}>
        <dt>Invited</dt>
        <dd>
          {formatDateTime(user.invitedAt)}
          {user.createdBy ? ` by ${user.createdBy.fullName}` : ""}
        </dd>
        <dt>Activated</dt>
        <dd>{formatDateTime(user.activatedAt)}</dd>
        {user.role === "MANAGER" && (
          <>
            <dt>Active recruits</dt>
            <dd data-testid="active-recruit-count">{user.activeRecruitCount ?? 0}</dd>
          </>
        )}
      </dl>
    </section>
  );
});

const EditUserForm = observer(function EditUserForm({ user }: { user: UserDetail }) {
  const { admin } = useStores();
  const [email, setEmail] = useState(user.email);
  const [fullName, setFullName] = useState(user.fullName);
  const [department, setDepartment] = useState(user.department ?? "");
  const [startDate, setStartDate] = useState(user.startDate ?? "");
  const [role, setRole] = useState<Role>(user.role);
  const [errors, setErrors] = useState<FormErrors>(EMPTY_ERRORS);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const emailEditable = user.status === "INVITED";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSaved(false);
    setErrors(EMPTY_ERRORS);
    const body: AdminUserUpdateRequest = {};
    if (fullName.trim() !== user.fullName) body.fullName = fullName.trim();
    if ((department.trim() || null) !== user.department) body.department = department.trim() || null;
    if ((startDate || null) !== user.startDate) body.startDate = startDate || null;
    if (role !== user.role) body.role = role;
    if (email.trim().toLowerCase() !== user.email) body.email = email.trim();
    try {
      if (Object.keys(body).length > 0) await admin.updateUser(user.id, body);
      setSaved(true);
    } catch (err) {
      setErrors(toFormErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="edit-user-title">
      <h2 id="edit-user-title" className={formStyles.title}>
        Edit user
      </h2>
      <form className={formStyles.form} onSubmit={(e) => void onSubmit(e)} noValidate data-testid="edit-user-form">
        {errors.form && (
          <div className={formStyles.formError} role="alert">
            {errors.form}
          </div>
        )}
        {saved && (
          <div className={formStyles.formSuccess} role="status">
            User saved.
          </div>
        )}
        <FormField
          id="user-email"
          label="Email"
          type="email"
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.fields.email}
          disabled={!emailEditable}
          hint={emailEditable ? "Editable until the user completes sign-up." : "Locked once the user has signed up."}
        />
        <FormField
          id="user-fullName"
          label="Full name"
          maxLength={100}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fields.fullName}
          required
        />
        <div className={formStyles.row}>
          <FormField
            id="user-department"
            label="Department"
            maxLength={100}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            error={errors.fields.department}
          />
          <FormField
            id="user-startDate"
            label="Start date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            error={errors.fields.startDate}
          />
        </div>
        <div className={formStyles.field}>
          <label htmlFor="user-role" className={formStyles.label}>
            Role
          </label>
          <select
            id="user-role"
            className={tableStyles.select}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            aria-invalid={errors.fields.role ? true : undefined}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <span className={formStyles.hint}>Role cannot change while the user is part of an active assignment.</span>
          {errors.fields.role && (
            <span className={formStyles.fieldError} role="alert">
              {errors.fields.role}
            </span>
          )}
        </div>
        <div className={formStyles.actions}>
          <button type="submit" className={formStyles.button} disabled={submitting}>
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
});

const UserDetailContent = observer(function UserDetailContent() {
  const { admin, assignments } = useStores();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const id = params.id;

  useEffect(() => {
    void admin.loadUser(id);
  }, [admin, id]);

  const user = admin.detail?.id === id ? admin.detail : null;

  if (admin.detailError && !user) {
    return (
      <section className={`${formStyles.card} ${formStyles.wide}`}>
        <div className={formStyles.formError} role="alert">
          {admin.detailError}
        </div>
        <p className={formStyles.footerText}>
          <Link href="/admin/users">Back to users</Link>
        </p>
      </section>
    );
  }
  if (!user) return null;

  return (
    <div className={formStyles.stack}>
      {search.get("created") && (
        <div className={formStyles.formSuccess} role="status" data-testid="created-banner">
          Invitation created. {user.fullName} can now complete sign-up with {user.email}.
        </div>
      )}
      <UserHeader user={user} />
      <EditUserForm key={user.updatedAt} user={user} />
      {user.role === "NEW_RECRUIT" && (
        <AssignmentPanel user={user} store={assignments} onAssigned={() => void admin.loadUser(id)} />
      )}
    </div>
  );
});

export default function AdminUserDetailPage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <Suspense fallback={null}>
        <UserDetailContent />
      </Suspense>
    </RequireRole>
  );
}
