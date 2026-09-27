"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { FormField } from "@/components/ui/FormField";
import styles from "@/components/ui/forms.module.css";
import type { FormErrors } from "@/lib/apiClient";
import { EMPTY_ERRORS, toFormErrors } from "@/lib/formErrors";
import { useStores } from "@/stores/StoreProvider";

const SignupPage = observer(function SignupPage() {
  const { auth } = useStores();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState<FormErrors>(EMPTY_ERRORS);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (auth.hydrated && auth.isAuthenticated) router.replace("/");
  }, [auth, auth.hydrated, auth.isAuthenticated, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors(EMPTY_ERRORS);
    if (password !== confirmPassword) {
      setErrors({ fields: { confirmPassword: "Passwords do not match." } });
      return;
    }
    setSubmitting(true);
    try {
      await auth.signup({ email, password, fullName: fullName.trim() || undefined });
      router.replace("/profile");
    } catch (err) {
      setErrors(toFormErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.card} aria-labelledby="signup-title">
      <h1 id="signup-title" className={styles.title}>
        Complete your sign-up
      </h1>
      <p className={styles.subtitle}>
        Your administrator has invited you. Choose a password to activate your account.
      </p>
      <form className={styles.form} onSubmit={(e) => void onSubmit(e)} noValidate>
        {errors.form && (
          <div className={styles.formError} role="alert">
            {errors.form}
          </div>
        )}
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.fields.email}
          required
        />
        <FormField
          id="fullName"
          label="Full name"
          hint="Leave blank to keep the name your administrator entered."
          autoComplete="name"
          maxLength={100}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fields.fullName}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="10–128 characters with at least one letter and one digit."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.fields.password}
          required
        />
        <FormField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.fields.confirmPassword}
          required
        />
        <button type="submit" className={styles.button} disabled={submitting}>
          {submitting ? "Activating…" : "Activate account"}
        </button>
      </form>
      <p className={styles.footerText}>
        Already activated? <Link href="/login">Log in</Link>
      </p>
    </section>
  );
});

export default SignupPage;
