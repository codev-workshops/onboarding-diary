import { useEffect, useState, type FormEvent } from "react";
import { AxiosError } from "axios";
import { apiClient } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { ApiError, UserResponse } from "../api/types";

export function ProfilePage() {
  const { user, logout, refresh } = useAuth();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setDepartment(user.department ?? "");
    }
  }, [user]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    setError(null);
    setSaving(true);
    try {
      await apiClient.put<UserResponse>("/me", { name, department: department || null });
      await refresh();
      setStatus("Profile updated");
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message ?? "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="page">
      <header className="topbar">
        <span className="brand">Onboarding Diary</span>
        <button type="button" className="link" onClick={logout}>
          Sign out
        </button>
      </header>

      <main className="content">
        <h1>My profile</h1>

        <dl className="readonly-grid">
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Role</dt>
          <dd>{user.role}</dd>
          <dt>Status</dt>
          <dd>{user.status}</dd>
          <dt>Join date</dt>
          <dd>{user.joinDate ?? "—"}</dd>
        </dl>

        <form className="card" onSubmit={handleSubmit} aria-label="Edit profile">
          {status && (
            <div className="success" role="status">
              {status}
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}

          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />

          <label htmlFor="department">Department</label>
          <input
            id="department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />

          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </main>
    </div>
  );
}
