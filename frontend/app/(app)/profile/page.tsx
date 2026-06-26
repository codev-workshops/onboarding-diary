"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/lib/protected-route";
import { getMyProfile, updateMyProfile } from "@/lib/api";
import { DEPARTMENTS } from "@/lib/constants";
import styles from "./profile.module.css";

const NAME_REGEX = /^[a-zA-Z\s\-']+$/;

function ProfileContent() {
  const { user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [startDate, setStartDate] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getMyProfile()
      .then(({ user: u }) => {
        setName(u.name);
        setDepartment(u.department);
        setStartDate(u.startDate ? u.startDate.split("T")[0] : "");
        setAvatarUrl(u.avatarUrl ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!name || name.length < 2 || name.length > 100)
      errs.name = "Name must be 2\u2013100 characters.";
    else if (!NAME_REGEX.test(name))
      errs.name = "Name may only contain letters, spaces, hyphens, and apostrophes.";

    if (!department || !DEPARTMENTS.includes(department as typeof DEPARTMENTS[number]))
      errs.department = "Please select a valid department.";

    if (!startDate) {
      errs.startDate = "Start date is required.";
    } else {
      const d = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxFuture = new Date(today);
      maxFuture.setDate(maxFuture.getDate() + 30);
      const maxPast = new Date(today);
      maxPast.setFullYear(maxPast.getFullYear() - 1);
      if (d > maxFuture) errs.startDate = "Start date cannot be more than 30 days in the future.";
      if (d < maxPast) errs.startDate = "Start date cannot be more than 1 year in the past.";
    }

    if (avatarUrl) {
      try {
        const u = new URL(avatarUrl);
        if (u.protocol !== "http:" && u.protocol !== "https:")
          errs.avatarUrl = "Must be an HTTP or HTTPS URL.";
      } catch {
        errs.avatarUrl = "Must be a valid URL.";
      }
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validate()) return;

    setSaving(true);
    try {
      await updateMyProfile({
        name,
        department,
        startDate,
        avatarUrl: avatarUrl || null,
      });
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>My Profile</h1>
        <button className={styles.backLink} onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {success && <p className={styles.success}>{success}</p>}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={user?.email ?? ""} disabled />
        </div>

        <div className={styles.field}>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />
          {fieldErrors.name && <p className={styles.fieldError}>{fieldErrors.name}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="department">Department</label>
          <select
            id="department"
            required
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">Select department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {fieldErrors.department && <p className={styles.fieldError}>{fieldErrors.department}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="startDate">Start Date</label>
          <input
            id="startDate"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          {fieldErrors.startDate && <p className={styles.fieldError}>{fieldErrors.startDate}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="avatarUrl">Avatar URL (optional)</label>
          <input
            id="avatarUrl"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.png"
          />
          {fieldErrors.avatarUrl && <p className={styles.fieldError}>{fieldErrors.avatarUrl}</p>}
        </div>

        <button type="submit" className={styles.button} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
