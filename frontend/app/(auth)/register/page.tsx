"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { register } from "@/lib/api";
import { DEPARTMENTS } from "@/lib/constants";
import styles from "../auth.module.css";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
const NAME_REGEX = /^[a-zA-Z\s\-']{2,100}$/;

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
    startDate: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!NAME_REGEX.test(form.name))
      errs.name = "2-100 chars, letters/spaces/hyphens/apostrophes only.";
    if (!form.email || form.email.length > 254)
      errs.email = "Valid email required (max 254 chars).";
    if (!PASSWORD_REGEX.test(form.password))
      errs.password = "Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special.";
    if (form.password !== form.confirmPassword)
      errs.confirmPassword = "Passwords do not match.";
    if (!form.department)
      errs.department = "Select a department.";

    if (form.startDate) {
      const d = new Date(form.startDate);
      const now = new Date();
      const future30 = new Date();
      future30.setDate(now.getDate() + 30);
      const past1y = new Date();
      past1y.setFullYear(now.getFullYear() - 1);
      if (d > future30) errs.startDate = "Cannot be more than 30 days in the future.";
      if (d < past1y) errs.startDate = "Cannot be more than 1 year in the past.";
    } else {
      errs.startDate = "Start date required.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setLoading(true);

    try {
      await register({
        email: form.email,
        password: form.password,
        name: form.name,
        department: form.department,
        startDate: form.startDate,
      });
      setSuccess(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1>Registration Successful</h1>
          <p className={styles.success}>
            Your account has been created. Check your email for confirmation.
          </p>
          <div className={styles.links}>
            <Link href="/login">Go to Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Create Account</h1>
        <p className={styles.subtitle}>Join the Onboarding Diary</p>

        {serverError && <p className={styles.error}>{serverError}</p>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="name">Name</label>
            <input id="name" required value={form.name} onChange={(e) => updateField("name", e.target.value)} />
            {errors.name && <p className={styles.fieldError}>{errors.name}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={form.email} onChange={(e) => updateField("email", e.target.value)} />
            {errors.email && <p className={styles.fieldError}>{errors.email}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required value={form.password} onChange={(e) => updateField("password", e.target.value)} />
            {errors.password && <p className={styles.fieldError}>{errors.password}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input id="confirmPassword" type="password" required value={form.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} />
            {errors.confirmPassword && <p className={styles.fieldError}>{errors.confirmPassword}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="department">Department</label>
            <select id="department" required value={form.department} onChange={(e) => updateField("department", e.target.value)}>
              <option value="">Select a department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {errors.department && <p className={styles.fieldError}>{errors.department}</p>}
          </div>

          <div className={styles.field}>
            <label htmlFor="startDate">Start Date</label>
            <input id="startDate" type="date" required value={form.startDate} onChange={(e) => updateField("startDate", e.target.value)} />
            {errors.startDate && <p className={styles.fieldError}>{errors.startDate}</p>}
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className={styles.links}>
          <Link href="/login">Already have an account? Sign In</Link>
        </div>
      </div>
    </div>
  );
}
