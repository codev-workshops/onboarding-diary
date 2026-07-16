import { useCallback, useEffect, useState } from "react";


const roles = ["Recruit", "Manager", "Admin"];

const emptySignup = {
  name: "",
  email: "",
  department: "",
  start_date: "",
  password: "",
};

const emptyAdminUser = {
  ...emptySignup,
  role: "Recruit",
};

const diaryConfigs = {
  tasks: {
    title: "Tasks",
    singular: "Task",
    endpoint: "/api/tasks",
    headingField: "title",
    contentField: "description",
    emptyForm: {
      date: "",
      title: "",
      description: "",
      category: "Training",
      status: "Not Started",
      priority: "Medium",
    },
    emptyFilters: { date: "", category: "", status: "" },
    categories: ["Training", "Setup", "Meeting", "Project", "Other"],
    statuses: ["Not Started", "In Progress", "Completed", "Blocked"],
    priorities: ["Low", "Medium", "High"],
  },
  issues: {
    title: "Issues",
    singular: "Issue",
    endpoint: "/api/issues",
    headingField: "title",
    contentField: "description",
    emptyForm: {
      date: "",
      title: "",
      description: "",
      severity: "Medium",
      status: "Open",
      resolution_notes: "",
    },
    emptyFilters: { status: "", severity: "" },
    statuses: ["Open", "In Progress", "Resolved", "Closed"],
    severities: ["Low", "Medium", "High", "Critical"],
  },
  feedback: {
    title: "Feedback",
    singular: "Feedback",
    endpoint: "/api/feedback",
    headingField: "subject",
    contentField: "details",
    emptyForm: {
      date: "",
      subject: "",
      type: "Positive",
      details: "",
    },
    emptyFilters: {},
    types: ["Positive", "Suggestion", "Concern"],
  },
  notes: {
    title: "Notes",
    singular: "Note",
    endpoint: "/api/notes",
    headingField: "title",
    contentField: "content",
    emptyForm: {
      date: "",
      title: "",
      content: "",
      tags: "",
    },
    emptyFilters: {},
  },
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm";

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });
  } catch {
    throw new Error("Unable to reach the server; please retry");
  }
  if (response.status === 204) {
    return null;
  }
  const body = await response.json();
  if (!response.ok) {
    const error = new Error(body.error?.message || "Request failed");
    error.fields = body.error?.fields || {};
    error.status = response.status;
    throw error;
  }
  return body;
}

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  error,
  required = true,
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        className={fieldClass}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        required={required}
      />
      {error ? (
        <span id={`${name}-error`} className="mt-1 block text-sm text-red-700">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function TextareaField({ label, name, value, onChange, error, required = true }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea
        className={`${fieldClass} min-h-24`}
        name={name}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        required={required}
      />
      {error ? (
        <span id={`${name}-error`} className="mt-1 block text-sm text-red-700">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function SelectField({ label, name, value, onChange, children, error }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select className={fieldClass} name={name} value={value} onChange={onChange}>
        {children}
      </select>
      {error ? (
        <span className="mt-1 block text-sm text-red-700">{error}</span>
      ) : null}
    </label>
  );
}

function StatusMessage({ message, tone = "neutral" }) {
  if (!message) {
    return null;
  }
  const color =
    tone === "error"
      ? "bg-red-50 text-red-800"
      : "bg-slate-50 text-slate-700";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-lg p-3 text-sm ${color}`}>
      {message}
    </p>
  );
}

function AuthCard({ children, title, subtitle }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-slate-200">
        <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">
          Onboarding Diary
        </p>
        <h1 className="mt-2 text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        {children}
      </section>
    </main>
  );
}

function Login({ onLogin, onShowSignup, initialEmail }) {
  const [form, setForm] = useState({
    email: initialEmail,
    password: "",
  });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const user = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onLogin(user);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in with your email and password."
    >
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <Field
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={(event) =>
            setForm({ ...form, email: event.target.value })
          }
        />
        <Field
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={(event) =>
            setForm({ ...form, password: event.target.value })
          }
        />
        <StatusMessage message={error} tone="error" />
        <button
          className="w-full rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800"
          type="submit"
        >
          Log in
        </button>
      </form>
      <button
        className="mt-4 w-full text-sm font-semibold text-teal-700"
        type="button"
        onClick={onShowSignup}
      >
        Create a Recruit account
      </button>
    </AuthCard>
  );
}

function Signup({ onCreated, onShowLogin }) {
  const [form, setForm] = useState(emptySignup);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setErrors({});
    setMessage("");
    try {
      await api("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onCreated(form.email.trim().toLowerCase());
    } catch (requestError) {
      setErrors(requestError.fields || {});
      setMessage(requestError.message);
    }
  }

  return (
    <AuthCard
      title="Start your diary"
      subtitle="Public sign-up always creates a Recruit account."
    >
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <Field
          label="Name"
          name="name"
          value={form.name}
          onChange={change}
          error={errors.name}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={change}
          error={errors.email}
        />
        <Field
          label="Department"
          name="department"
          value={form.department}
          onChange={change}
          error={errors.department}
        />
        <Field
          label="Start date"
          name="start_date"
          type="date"
          value={form.start_date}
          onChange={change}
          error={errors.start_date}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={change}
          error={errors.password}
        />
        <StatusMessage message={message} tone="error" />
        <button
          className="w-full rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800"
          type="submit"
        >
          Sign up
        </button>
      </form>
      <button
        className="mt-4 w-full text-sm font-semibold text-teal-700"
        type="button"
        onClick={onShowLogin}
      >
        Back to login
      </button>
    </AuthCard>
  );
}

function Shell({ user, page, onNavigate, onLogout, children }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">
              Onboarding Diary
            </p>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Main navigation">
            <button
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                page === "dashboard" ? "bg-teal-50 text-teal-800" : "text-slate-600"
              }`}
              onClick={() => onNavigate("dashboard")}
            >
              Dashboard
            </button>
            <button
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                page === "tasks" ? "bg-teal-50 text-teal-800" : "text-slate-600"
              }`}
              onClick={() => onNavigate("tasks")}
            >
              Tasks
            </button>
            <button
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                page === "issues" ? "bg-teal-50 text-teal-800" : "text-slate-600"
              }`}
              onClick={() => onNavigate("issues")}
            >
              Issues
            </button>
            <button
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                page === "feedback" ? "bg-teal-50 text-teal-800" : "text-slate-600"
              }`}
              onClick={() => onNavigate("feedback")}
            >
              Feedback
            </button>
            <button
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                page === "notes" ? "bg-teal-50 text-teal-800" : "text-slate-600"
              }`}
              onClick={() => onNavigate("notes")}
            >
              Notes
            </button>
            {user.role === "Admin" ? (
              <button
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  page === "admin" ? "bg-teal-50 text-teal-800" : "text-slate-600"
                }`}
                onClick={() => onNavigate("admin")}
              >
                Users & Assignments
              </button>
            ) : null}
            <button
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                page === "profile" ? "bg-teal-50 text-teal-800" : "text-slate-600"
              }`}
              onClick={() => onNavigate("profile")}
            >
              Profile
            </button>
            <button
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
              onClick={onLogout}
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}

function DiaryPage({ kind, user, onUnauthorized }) {
  const config = diaryConfigs[kind];
  const [recruits, setRecruits] = useState([]);
  const [ownerId, setOwnerId] = useState(
    user.role === "Recruit" ? String(user.id) : "",
  );
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(config.emptyForm);
  const [filters, setFilters] = useState(config.emptyFilters);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  const loadEntries = useCallback(async () => {
    if (!ownerId) {
      setEntries([]);
      return true;
    }
    const parameters = new URLSearchParams({ owner_id: ownerId });
    Object.entries(filters).forEach(([name, value]) => {
      if (value) {
        parameters.set(name, value);
      }
    });
    try {
      const records = await api(`${config.endpoint}?${parameters}`);
      setEntries(records);
      setMessage("");
      return true;
    } catch (requestError) {
      if (requestError.status === 401) {
        onUnauthorized();
        return false;
      }
      setEntries([]);
      setMessage(requestError.message);
      return false;
    }
  }, [config.endpoint, filters, onUnauthorized, ownerId]);

  useEffect(() => {
    api("/api/diary/recruits")
      .then((records) => {
        setRecruits(records);
        if (user.role !== "Recruit" && records.length > 0) {
          setOwnerId((current) => current || String(records[0].id));
        }
      })
      .catch((requestError) => {
        if (requestError.status === 401) {
          onUnauthorized();
          return;
        }
        setMessage(requestError.message);
      });
  }, [onUnauthorized, user.role]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  function changeForm(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function changeFilter(event) {
    setFilters({ ...filters, [event.target.name]: event.target.value });
  }

  function resetForm() {
    setForm(config.emptyForm);
    setEditingId(null);
    setErrors({});
  }

  async function submit(event) {
    event.preventDefault();
    setErrors({});
    setMessage("");
    const formPayload =
      kind === "notes"
        ? {
            ...form,
            tags: form.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          }
        : form;
    const payload = editingId
      ? formPayload
      : { ...formPayload, owner_id: Number(ownerId) };
    try {
      await api(
        editingId ? `${config.endpoint}/${editingId}` : config.endpoint,
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      const confirmation = `${config.singular} ${editingId ? "saved" : "created"}`;
      resetForm();
      if (await loadEntries()) {
        setMessage(confirmation);
      }
    } catch (requestError) {
      if (requestError.status === 401) {
        onUnauthorized();
        return;
      }
      setErrors(requestError.fields || {});
      setMessage(requestError.message);
    }
  }

  function edit(entry) {
    const editable = { ...entry };
    delete editable.id;
    delete editable.owner_id;
    delete editable.created_at;
    if (kind === "notes") {
      editable.tags = editable.tags.join(", ");
    }
    setForm(editable);
    setEditingId(entry.id);
    setErrors({});
    setMessage("");
  }

  async function remove(entry) {
    if (!window.confirm(`Delete ${entry[config.headingField]}?`)) {
      return;
    }
    try {
      await api(`${config.endpoint}/${entry.id}`, { method: "DELETE" });
      if (editingId === entry.id) {
        resetForm();
      }
      if (await loadEntries()) {
        setMessage(`${config.singular} deleted`);
      }
    } catch (requestError) {
      if (requestError.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(requestError.message);
    }
  }

  const needsResolution =
    kind === "issues" && ["Resolved", "Closed"].includes(form.status);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{config.title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Maintain entries for an authorized Recruit.
        </p>
      </div>

      {user.role !== "Recruit" ? (
        <SelectField
          label="Recruit"
          name="owner_id"
          value={ownerId}
          onChange={(event) => setOwnerId(event.target.value)}
        >
          {recruits.length === 0 ? (
            <option value="">No recruits available</option>
          ) : null}
          {recruits.map((recruit) => (
            <option key={recruit.id} value={recruit.id}>
              {recruit.name}
            </option>
          ))}
        </SelectField>
      ) : null}

      <form
        className="grid gap-4 rounded-2xl bg-white p-6 shadow md:grid-cols-2"
        onSubmit={submit}
      >
        <h2 className="md:col-span-2 text-xl font-semibold">
          {editingId ? `Edit ${config.singular}` : `Add ${config.singular}`}
        </h2>
        <Field
          label={`${config.singular} date`}
          name="date"
          type="date"
          value={form.date}
          onChange={changeForm}
          error={errors.date}
        />
        <Field
          label={`${config.singular} ${
            config.headingField === "subject" ? "subject" : "title"
          }`}
          name={config.headingField}
          value={form[config.headingField]}
          onChange={changeForm}
          error={errors[config.headingField]}
        />
        <div className="md:col-span-2">
          <TextareaField
            label={`${config.singular} ${config.contentField}`}
            name={config.contentField}
            value={form[config.contentField]}
            onChange={changeForm}
            error={errors[config.contentField]}
            required={kind !== "tasks"}
          />
        </div>
        {kind === "tasks" ? (
          <>
            <SelectField
              label="Task category"
              name="category"
              value={form.category}
              onChange={changeForm}
              error={errors.category}
            >
              {config.categories.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </SelectField>
            <SelectField
              label="Task status"
              name="status"
              value={form.status}
              onChange={changeForm}
              error={errors.status}
            >
              {config.statuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </SelectField>
            <SelectField
              label="Task priority"
              name="priority"
              value={form.priority}
              onChange={changeForm}
              error={errors.priority}
            >
              {config.priorities.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </SelectField>
          </>
        ) : kind === "issues" ? (
          <>
            <SelectField
              label="Issue severity"
              name="severity"
              value={form.severity}
              onChange={changeForm}
              error={errors.severity}
            >
              {config.severities.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </SelectField>
            <SelectField
              label="Issue status"
              name="status"
              value={form.status}
              onChange={changeForm}
              error={errors.status}
            >
              {config.statuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </SelectField>
            <div className="md:col-span-2">
              <TextareaField
                label="Resolution notes"
                name="resolution_notes"
                value={form.resolution_notes}
                onChange={changeForm}
                error={errors.resolution_notes}
                required={needsResolution}
              />
            </div>
          </>
        ) : kind === "feedback" ? (
          <SelectField
            label="Feedback type"
            name="type"
            value={form.type}
            onChange={changeForm}
            error={errors.type}
          >
            {config.types.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </SelectField>
        ) : (
          <Field
            label="Note tags"
            name="tags"
            value={form.tags}
            onChange={changeForm}
            error={errors.tags}
            required={false}
          />
        )}
        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button
            className="rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white"
            type="submit"
            disabled={!ownerId}
          >
            {editingId ? `Save ${config.singular}` : `Create ${config.singular}`}
          </button>
          {editingId ? (
            <button
              className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold"
              type="button"
              onClick={resetForm}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
        <div className="md:col-span-2">
          <StatusMessage message={message} tone={message === "Access denied" ? "error" : "neutral"} />
        </div>
      </form>

      {Object.keys(config.emptyFilters).length > 0 ? (
        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">Filters</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {kind === "tasks" ? (
              <>
                <Field
                  label="Filter date"
                  name="date"
                  type="date"
                  value={filters.date}
                  onChange={changeFilter}
                  required={false}
                />
                <SelectField
                  label="Filter category"
                  name="category"
                  value={filters.category}
                  onChange={changeFilter}
                >
                  <option value="">All categories</option>
                  {config.categories.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </SelectField>
                <SelectField
                  label="Filter task status"
                  name="status"
                  value={filters.status}
                  onChange={changeFilter}
                >
                  <option value="">All statuses</option>
                  {config.statuses.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </SelectField>
              </>
            ) : (
              <>
                <SelectField
                  label="Filter issue status"
                  name="status"
                  value={filters.status}
                  onChange={changeFilter}
                >
                  <option value="">All statuses</option>
                  {config.statuses.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </SelectField>
                <SelectField
                  label="Filter severity"
                  name="severity"
                  value={filters.severity}
                  onChange={changeFilter}
                >
                  <option value="">All severities</option>
                  {config.severities.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </SelectField>
              </>
            )}
          </div>
        </section>
      ) : null}

      <section className="space-y-4" aria-label={`${config.title} list`}>
        {entries.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-slate-600 shadow">
            No {config.title.toLowerCase()} found.
          </p>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className="rounded-2xl bg-white p-5 shadow">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-teal-700">{entry.date}</p>
                  <h3 className="text-lg font-semibold">
                    {entry[config.headingField]}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                    {entry[config.contentField] || "No description"}
                  </p>
                  <p className="mt-3 text-sm text-slate-700">
                    {kind === "tasks"
                      ? `${entry.category} · ${entry.status} · ${entry.priority}`
                      : kind === "issues"
                        ? `${entry.severity} · ${entry.status}`
                        : kind === "feedback"
                          ? entry.type
                          : entry.tags.length > 0
                            ? entry.tags.join(", ")
                            : "No tags"}
                  </p>
                  {entry.resolution_notes ? (
                    <p className="mt-2 text-sm text-slate-600">
                      Resolution: {entry.resolution_notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                    type="button"
                    onClick={() => edit(entry)}
                    aria-label={`Edit ${entry[config.headingField]}`}
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white"
                    type="button"
                    onClick={() => remove(entry)}
                    aria-label={`Delete ${entry[config.headingField]}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </section>
  );
}

function Dashboard({ user }) {
  return (
    <section>
      <p className="text-sm font-semibold text-teal-700">{user.role}</p>
      <h1 className="mt-2 text-4xl font-bold">Welcome, {user.name}</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Your account is ready. Open your profile to review or update your
        onboarding details.
      </p>
    </section>
  );
}

function Profile({ user, onUpdated, onUnauthorized }) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    department: user.department,
    start_date: user.start_date,
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setErrors({});
    setStatus("");
    try {
      const updated = await api("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      onUpdated(updated);
      setStatus("Profile saved");
    } catch (requestError) {
      if (requestError.status === 401) {
        onUnauthorized();
        return;
      }
      setErrors(requestError.fields || {});
      setStatus(requestError.message);
    }
  }

  return (
    <section className="max-w-xl">
      <h1 className="text-3xl font-bold">Profile</h1>
      <p className="mt-2 text-sm text-slate-600">
        Role: <strong>{user.role}</strong>
      </p>
      <form className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow" onSubmit={submit}>
        <Field
          label="Name"
          name="name"
          value={form.name}
          onChange={change}
          error={errors.name}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={change}
          error={errors.email}
        />
        <Field
          label="Department"
          name="department"
          value={form.department}
          onChange={change}
          error={errors.department}
        />
        <Field
          label="Start date"
          name="start_date"
          type="date"
          value={form.start_date}
          onChange={change}
          error={errors.start_date}
        />
        <StatusMessage message={status} />
        <button
          className="rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800"
          type="submit"
        >
          Save profile
        </button>
      </form>
    </section>
  );
}

function UserEditor({ user, users, onChanged, onCurrentUserChanged }) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    department: user.department,
    start_date: user.start_date,
    role: user.role,
  });
  const [managerId, setManagerId] = useState(user.assigned_manager_id || "");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const managers = users.filter((candidate) => candidate.role === "Manager");

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function save() {
    setErrors({});
    setMessage("");
    try {
      const updated = await api(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setMessage("User saved");
      onChanged();
      onCurrentUserChanged(updated);
    } catch (requestError) {
      setErrors(requestError.fields || {});
      setMessage(requestError.message);
    }
  }

  async function deleteUser() {
    setMessage("");
    try {
      await api(`/api/admin/users/${user.id}`, { method: "DELETE" });
      onChanged();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  async function saveAssignment() {
    setMessage("");
    try {
      if (managerId) {
        await api(`/api/admin/recruits/${user.id}/manager`, {
          method: "PUT",
          body: JSON.stringify({ manager_id: Number(managerId) }),
        });
      } else {
        await api(`/api/admin/recruits/${user.id}/manager`, {
          method: "DELETE",
        });
      }
      setMessage("Assignment saved");
      onChanged();
    } catch (requestError) {
      setMessage(requestError.message);
    }
  }

  return (
    <article className="space-y-4 rounded-2xl bg-white p-5 shadow">
      <div>
        <h3 className="text-lg font-semibold">{user.name}</h3>
        <p className="text-sm text-slate-600">
          #{user.id} · {user.email} · {user.role}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label={`Name for user ${user.id}`}
          name="name"
          value={form.name}
          onChange={change}
          error={errors.name}
        />
        <Field
          label={`Email for user ${user.id}`}
          name="email"
          type="email"
          value={form.email}
          onChange={change}
          error={errors.email}
        />
        <Field
          label={`Department for user ${user.id}`}
          name="department"
          value={form.department}
          onChange={change}
          error={errors.department}
        />
        <Field
          label={`Start date for user ${user.id}`}
          name="start_date"
          type="date"
          value={form.start_date}
          onChange={change}
          error={errors.start_date}
        />
        <SelectField
          label={`Role for user ${user.id}`}
          name="role"
          value={form.role}
          onChange={change}
          error={errors.role}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </SelectField>
      </div>
      {user.role === "Recruit" ? (
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <SelectField
            label={`Manager assignment for user ${user.id}`}
            name="manager_id"
            value={managerId}
            onChange={(event) => setManagerId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </SelectField>
          <button
            className="self-end rounded-lg border border-teal-700 px-4 py-2.5 text-sm font-semibold text-teal-800"
            type="button"
            onClick={saveAssignment}
          >
            Save assignment
          </button>
        </div>
      ) : null}
      <StatusMessage
        message={message}
        tone={message.endsWith("saved") ? "neutral" : "error"}
      />
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white"
          type="button"
          onClick={save}
        >
          Save user {user.id}
        </button>
        <button
          className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700"
          type="button"
          onClick={deleteUser}
        >
          Delete user {user.id}
        </button>
      </div>
    </article>
  );
}

function AdminUsers({ currentUser, onCurrentUserChanged, onUnauthorized }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyAdminUser);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await api("/api/admin/users"));
    } catch (requestError) {
      if (requestError.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(requestError.message);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function createUser(event) {
    event.preventDefault();
    setErrors({});
    setMessage("");
    try {
      await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(emptyAdminUser);
      setMessage("User created");
      await loadUsers();
    } catch (requestError) {
      setErrors(requestError.fields || {});
      setMessage(requestError.message);
    }
  }

  function maybeUpdateCurrentUser(updated) {
    if (updated.id === currentUser.id) {
      onCurrentUserChanged(updated);
    }
  }

  return (
    <section className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-teal-700">Admin</p>
        <h1 className="mt-2 text-3xl font-bold">Users & Assignments</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create users, edit roles, delete users, and maintain one manager per Recruit.
        </p>
      </div>
      <form className="space-y-4 rounded-2xl bg-white p-6 shadow" onSubmit={createUser}>
        <h2 className="text-xl font-semibold">Create user</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="New user name"
            name="name"
            value={form.name}
            onChange={change}
            error={errors.name}
          />
          <Field
            label="New user email"
            name="email"
            type="email"
            value={form.email}
            onChange={change}
            error={errors.email}
          />
          <Field
            label="New user department"
            name="department"
            value={form.department}
            onChange={change}
            error={errors.department}
          />
          <Field
            label="New user start date"
            name="start_date"
            type="date"
            value={form.start_date}
            onChange={change}
            error={errors.start_date}
          />
          <Field
            label="New user password"
            name="password"
            type="password"
            value={form.password}
            onChange={change}
            error={errors.password}
          />
          <SelectField
            label="New user role"
            name="role"
            value={form.role}
            onChange={change}
            error={errors.role}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </SelectField>
        </div>
        <StatusMessage
          message={message}
          tone={message.endsWith("created") ? "neutral" : "error"}
        />
        <button
          className="rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white"
          type="submit"
        >
          Create user
        </button>
      </form>
      <div className="space-y-4">
        {users.map((user) => (
          <UserEditor
            key={user.id}
            user={user}
            users={users}
            onChanged={loadUsers}
            onCurrentUserChanged={maybeUpdateCurrentUser}
          />
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("loading");
  const [loginEmail, setLoginEmail] = useState("");

  const clearSession = useCallback(() => {
    setUser(null);
    setPage("login");
  }, []);

  useEffect(() => {
    api("/api/profile")
      .then((profile) => {
        setUser(profile);
        setPage("dashboard");
      })
      .catch(() => setPage("login"));
  }, []);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    clearSession();
  }

  if (page === "loading") {
    return <p className="p-8 text-center text-slate-600">Loading.</p>;
  }
  if (!user && page === "signup") {
    return (
      <Signup
        onCreated={(email) => {
          setLoginEmail(email);
          setPage("login");
        }}
        onShowLogin={() => setPage("login")}
      />
    );
  }
  if (!user) {
    return (
      <Login
        initialEmail={loginEmail}
        onLogin={(profile) => {
          setUser(profile);
          setPage("dashboard");
        }}
        onShowSignup={() => setPage("signup")}
      />
    );
  }

  return (
    <Shell
      user={user}
      page={page}
      onNavigate={setPage}
      onLogout={logout}
    >
      {page === "admin" && user.role === "Admin" ? (
        <AdminUsers
          currentUser={user}
          onCurrentUserChanged={setUser}
          onUnauthorized={clearSession}
        />
      ) : page === "tasks" ? (
        <DiaryPage
          key="tasks"
          kind="tasks"
          user={user}
          onUnauthorized={clearSession}
        />
      ) : page === "issues" ? (
        <DiaryPage
          key="issues"
          kind="issues"
          user={user}
          onUnauthorized={clearSession}
        />
      ) : page === "feedback" ? (
        <DiaryPage
          key="feedback"
          kind="feedback"
          user={user}
          onUnauthorized={clearSession}
        />
      ) : page === "notes" ? (
        <DiaryPage
          key="notes"
          kind="notes"
          user={user}
          onUnauthorized={clearSession}
        />
      ) : page === "profile" ? (
        <Profile user={user} onUpdated={setUser} onUnauthorized={clearSession} />
      ) : (
        <Dashboard user={user} />
      )}
    </Shell>
  );
}
