"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { FormField } from "@/components/ui/FormField";
import styles from "@/components/ui/forms.module.css";
import type { FormErrors } from "@/lib/apiClient";
import { EMPTY_ERRORS, toFormErrors } from "@/lib/formErrors";
import { useStores } from "@/stores/StoreProvider";

function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

const LoginForm = observer(function LoginForm() {
  const { auth } = useStores();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>(EMPTY_ERRORS);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (auth.hydrated && auth.isAuthenticated) router.replace(next);
  }, [auth, auth.hydrated, auth.isAuthenticated, next, router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors(EMPTY_ERRORS);
    try {
      await auth.login({ email, password });
      router.replace(next);
    } catch (err) {
      setErrors(toFormErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.card} aria-labelledby="login-title">
      <h1 id="login-title" className={styles.title}>
        Log in
      </h1>
      <p className={styles.subtitle}>Use the email address you were invited with.</p>
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
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.fields.password}
          required
        />
        <button type="submit" className={styles.button} disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className={styles.footerText}>
        Invited but no password yet? <Link href="/signup">Complete your sign-up</Link>
      </p>
    </section>
  );
});

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
