"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { FormField } from "@/components/ui/FormField";
import { ROLES, ROLE_LABELS } from "@/components/ui/labels";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";
import type { FormErrors, Role } from "@/lib/apiClient";
import { EMPTY_ERRORS, toFormErrors } from "@/lib/formErrors";
import { useStores } from "@/stores/StoreProvider";

const InviteUserForm = observer(function InviteUserForm() {
  const { admin } = useStores();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("NEW_RECRUIT");
  const [department, setDepartment] = useState("");
  const [startDate, setStartDate] = useState("");
  const [errors, setErrors] = useState<FormErrors>(EMPTY_ERRORS);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors(EMPTY_ERRORS);
    try {
      const created = await admin.createUser({
        email: email.trim(),
        fullName: fullName.trim(),
        role,
        department: department.trim() || undefined,
        startDate: startDate || undefined,
      });
      router.push(`/admin/users/${created.id}?created=1`);
    } catch (err) {
      setErrors(toFormErrors(err));
      setSubmitting(false);
    }
  };

  return (
    <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="invite-title">
      <h1 id="invite-title" className={formStyles.title}>
        Invite user
      </h1>
      <p className={formStyles.subtitle}>
        The user is created as <strong>INVITED</strong> without a password and completes sign-up with this email.
      </p>
      <form className={formStyles.form} onSubmit={(e) => void onSubmit(e)} noValidate data-testid="invite-form">
        {errors.form && (
          <div className={formStyles.formError} role="alert">
            {errors.form}
          </div>
        )}
        <FormField
          id="invite-email"
          label="Email"
          type="email"
          autoComplete="off"
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.fields.email}
          required
        />
        <FormField
          id="invite-fullName"
          label="Full name"
          maxLength={100}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fields.fullName}
          required
        />
        <div className={formStyles.field}>
          <label htmlFor="invite-role" className={formStyles.label}>
            Role
          </label>
          <select
            id="invite-role"
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
          {errors.fields.role && (
            <span className={formStyles.fieldError} role="alert">
              {errors.fields.role}
            </span>
          )}
        </div>
        <div className={formStyles.row}>
          <FormField
            id="invite-department"
            label="Department"
            maxLength={100}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            error={errors.fields.department}
          />
          <FormField
            id="invite-startDate"
            label="Start date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            error={errors.fields.startDate}
          />
        </div>
        <div className={formStyles.actions}>
          <button type="submit" className={formStyles.button} disabled={submitting}>
            {submitting ? "Inviting…" : "Send invitation"}
          </button>
          <Link href="/admin/users" className={`${formStyles.button} ${formStyles.buttonSecondary}`}>
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
});

export default function NewUserPage() {
  return (
    <RequireRole roles={["ADMIN"]}>
      <InviteUserForm />
    </RequireRole>
  );
}
