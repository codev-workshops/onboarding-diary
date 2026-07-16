import { useCallback, useEffect, useId, useRef, useState } from "react";


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
      tags: [],
    },
    emptyFilters: {},
  },
};

const fieldClass =
  "mt-1 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm";
const tagLiteralError =
  'Each tag must be a valid JSON string, for example "release"';
const inFlightGetRequests = new Map();

function parseTagLiterals(tags) {
  return tags.map((literal) => {
    let tag;
    try {
      tag = JSON.parse(literal);
    } catch {
      throw new Error(tagLiteralError);
    }
    if (typeof tag !== "string") {
      throw new Error(tagLiteralError);
    }
    return tag;
  });
}

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
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  if (!response.ok) {
    const error = new Error(body.error?.message || "Request failed");
    error.fields =
      body.error?.fields && typeof body.error.fields === "object"
        ? body.error.fields
        : {};
    error.status = response.status;
    throw error;
  }
  return body;
}

async function responseError(response) {
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  const error = new Error(
    body.error?.message ||
      (response.status >= 500
        ? "An unexpected error occurred; please retry"
        : "Request failed"),
  );
  error.fields =
    body.error?.fields && typeof body.error.fields === "object"
      ? body.error.fields
      : {};
  error.status = response.status;
  return error;
}

function getRequestKey(scope, path) {
  return `${scope}:${path}`;
}

function acquireInFlightGet(path, scope) {
  const key = getRequestKey(scope, path);
  const existing = inFlightGetRequests.get(key);
  if (existing && !existing.controller.signal.aborted) {
    existing.consumers += 1;
    clearTimeout(existing.abortTimer);
    existing.abortTimer = null;
    return existing;
  }
  if (existing) {
    inFlightGetRequests.delete(key);
  }
  const controller = new AbortController();
  const entry = {
    abortTimer: null,
    consumers: 1,
    controller,
    promise: null,
  };
  entry.promise = api(path, { signal: controller.signal }).finally(() => {
    if (inFlightGetRequests.get(key) === entry) {
      inFlightGetRequests.delete(key);
    }
  });
  inFlightGetRequests.set(key, entry);
  return entry;
}

function releaseInFlightGet(path, scope, entry) {
  const key = getRequestKey(scope, path);
  if (inFlightGetRequests.get(key) !== entry) {
    return;
  }
  entry.consumers -= 1;
  if (entry.consumers > 0) {
    return;
  }
  entry.abortTimer = setTimeout(() => {
    if (inFlightGetRequests.get(key) === entry && entry.consumers <= 0) {
      entry.controller.abort();
    }
  }, 0);
}

function clearInFlightGetRequests() {
  inFlightGetRequests.forEach((entry) => {
    clearTimeout(entry.abortTimer);
    entry.controller.abort();
  });
  inFlightGetRequests.clear();
}

function buildReportRequestKey(recruitId, criteria, requestScope) {
  return JSON.stringify({
    recruitId,
    type: criteria.type,
    startDate: criteria.start_date,
    endDate: criteria.end_date,
    format: criteria.format,
    requestScope,
  });
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
  const inputId = useId();
  const errorId = `${inputId}-error`;
  return (
    <label
      className="block min-w-0 text-sm font-medium text-slate-700"
      htmlFor={inputId}
    >
      {label}
      <input
        id={inputId}
        className={fieldClass}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        required={required}
      />
      {error ? (
        <span id={errorId} className="mt-1 block break-words text-sm text-red-700">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function TextareaField({ label, name, value, onChange, error, required = true }) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  return (
    <label
      className="block min-w-0 text-sm font-medium text-slate-700"
      htmlFor={inputId}
    >
      {label}
      <textarea
        id={inputId}
        className={`${fieldClass} min-h-24`}
        name={name}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        required={required}
      />
      {error ? (
        <span id={errorId} className="mt-1 block break-words text-sm text-red-700">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function SelectField({ label, name, value, onChange, children, error }) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  return (
    <label
      className="block min-w-0 text-sm font-medium text-slate-700"
      htmlFor={inputId}
    >
      {label}
      <select
        id={inputId}
        className={fieldClass}
        name={name}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      >
        {children}
      </select>
      {error ? (
        <span id={errorId} className="mt-1 block break-words text-sm text-red-700">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function TagsField({ tags, onChange, error }) {
  function updateTag(index, value) {
    onChange(tags.map((tag, tagIndex) => (tagIndex === index ? value : tag)));
  }

  function removeTag(index) {
    onChange(tags.filter((_, tagIndex) => tagIndex !== index));
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-700">Note tags</legend>
      {tags.length === 0 ? (
        <p className="text-sm text-slate-600">No tags added.</p>
      ) : null}
      {tags.map((tag, index) => (
        <div key={index} className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 text-sm text-slate-700">
            Tag {index + 1}
            <input
              className={fieldClass}
              type="text"
              value={tag}
              onChange={(event) => updateTag(index, event.target.value)}
              aria-label={`Note tag ${index + 1}`}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "tags-help tags-error" : "tags-help"}
            />
          </label>
          <button
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
            type="button"
            onClick={() => removeTag(index)}
            aria-label={`Remove tag ${index + 1}`}
          >
            Remove
          </button>
        </div>
      ))}
      <p id="tags-help" className="text-sm text-slate-600">
        Each tag is a JSON string literal. Example:{" "}
        <code>{JSON.stringify("release")}</code>. Use JSON escapes for line
        breaks, tabs, quotes, and backslashes.
      </p>
      <button
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        type="button"
        onClick={() => onChange([...tags, JSON.stringify("")])}
        disabled={tags.length >= 10}
      >
        Add tag
      </button>
      {error ? (
        <p id="tags-error" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </fieldset>
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
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`break-words rounded-lg p-3 text-sm ${color}`}
    >
      {message}
    </p>
  );
}

function AuthCard({ children, title, subtitle }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6 sm:py-10">
      <section className="min-w-0 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl shadow-slate-200 sm:p-8">
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
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onLogin(user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
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
          disabled={submitting}
        >
          {submitting ? "Logging in" : "Log in"}
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
  const [submitting, setSubmitting] = useState(false);

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setErrors({});
    setMessage("");
    setSubmitting(true);
    try {
      await api("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onCreated(form.email.trim().toLowerCase());
    } catch (requestError) {
      setErrors(requestError.fields || {});
      setMessage(requestError.message);
    } finally {
      setSubmitting(false);
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
          disabled={submitting}
        >
          {submitting ? "Signing up" : "Sign up"}
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

function Shell({ user, page, onNavigate, onLogout, message, children }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">
              Onboarding Diary
            </p>
            <p className="break-all text-sm text-slate-500">{user.email}</p>
          </div>
          <nav
            className="flex w-full flex-wrap items-center gap-2 lg:w-auto"
            aria-label="Main navigation"
          >
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
            <button
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                page === "reports" ? "bg-teal-50 text-teal-800" : "text-slate-600"
              }`}
              onClick={() => onNavigate("reports")}
            >
              Reports
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
      <main className="mx-auto min-w-0 max-w-5xl px-4 py-6 sm:py-10">
        <StatusMessage message={message} tone="error" />
        {children}
      </main>
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
  const [loading, setLoading] = useState(Boolean(ownerId));
  const [recruitsLoading, setRecruitsLoading] = useState(
    user.role !== "Recruit",
  );
  const [retryable, setRetryable] = useState(false);
  const [retryTarget, setRetryTarget] = useState("entries");
  const loadSequenceRef = useRef(0);

  const loadEntries = useCallback(async () => {
    const requestId = loadSequenceRef.current + 1;
    loadSequenceRef.current = requestId;
    if (!ownerId) {
      setEntries([]);
      setLoading(false);
      return true;
    }
    const parameters = new URLSearchParams({ owner_id: ownerId });
    Object.entries(filters).forEach(([name, value]) => {
      if (value) {
        parameters.set(name, value);
      }
    });
    setLoading(true);
    try {
      const records = await api(`${config.endpoint}?${parameters}`);
      if (requestId !== loadSequenceRef.current) {
        return false;
      }
      setEntries(records);
      setMessage("");
      setRetryable(false);
      return true;
    } catch (requestError) {
      if (requestId !== loadSequenceRef.current) {
        return false;
      }
      if (requestError.status === 401) {
        onUnauthorized();
        return false;
      }
      if ([403, 404].includes(requestError.status)) {
        setEntries([]);
      }
      setMessage(requestError.message);
      setRetryable(!requestError.status || requestError.status >= 500);
      setRetryTarget("entries");
      return false;
    } finally {
      if (requestId === loadSequenceRef.current) {
        setLoading(false);
      }
    }
  }, [config.endpoint, filters, onUnauthorized, ownerId]);

  useEffect(() => {
    let active = true;
    setRecruitsLoading(user.role !== "Recruit");
    api("/api/diary/recruits")
      .then((records) => {
        if (!active) {
          return;
        }
        setRecruits(records);
        if (user.role !== "Recruit" && records.length > 0) {
          setOwnerId((current) => current || String(records[0].id));
        }
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }
        if (requestError.status === 401) {
          onUnauthorized();
          return;
        }
        setMessage(requestError.message);
        setRetryable(!requestError.status || requestError.status >= 500);
        setRetryTarget("recruits");
      })
      .finally(() => {
        if (active) {
          setRecruitsLoading(false);
        }
      });
    return () => {
      active = false;
    };
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

  function changeOwner(event) {
    loadSequenceRef.current += 1;
    setOwnerId(event.target.value);
    setEntries([]);
    setForm(config.emptyForm);
    setEditingId(null);
    setErrors({});
    setMessage("");
    setRetryable(false);
    setRetryTarget("entries");
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
    setRetryable(false);
    let submissionForm = form;
    if (kind === "notes") {
      try {
        submissionForm = { ...form, tags: parseTagLiterals(form.tags) };
      } catch (tagError) {
        setErrors({ tags: tagError.message });
        return;
      }
    }
    const payload = editingId
      ? submissionForm
      : { ...submissionForm, owner_id: Number(ownerId) };
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
      setRetryable(false);
    }
  }

  function edit(entry) {
    const editable = { ...entry };
    delete editable.id;
    delete editable.owner_id;
    delete editable.created_at;
    if (kind === "notes") {
      editable.tags = editable.tags.map((tag) => JSON.stringify(tag));
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
      setRetryable(false);
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
          onChange={changeOwner}
        >
          {recruits.length === 0 ? (
            <option value="">
              {recruitsLoading ? "Loading recruits" : "No recruits available"}
            </option>
          ) : null}
          {recruits.map((recruit) => (
            <option key={recruit.id} value={recruit.id}>
              {recruit.name}
            </option>
          ))}
        </SelectField>
      ) : null}

      <form
        className="grid min-w-0 gap-4 rounded-2xl bg-white p-4 shadow sm:p-6 md:grid-cols-2"
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
          <TagsField
            tags={form.tags}
            onChange={(tags) => setForm({ ...form, tags })}
            error={errors.tags}
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
          {retryable ? (
            <button
              className="mt-3 rounded-lg border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800"
              type="button"
              onClick={() => {
                if (retryTarget === "recruits") {
                  window.location.reload();
                  return;
                }
                loadEntries();
              }}
            >
              Retry loading
            </button>
          ) : null}
        </div>
      </form>

      {Object.keys(config.emptyFilters).length > 0 ? (
        <section className="min-w-0 rounded-2xl bg-white p-4 shadow sm:p-6">
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

      <section
        className="min-w-0 space-y-4"
        aria-label={`${config.title} list`}
        aria-busy={loading}
      >
        {loading && entries.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-slate-600 shadow">
            Loading {config.title.toLowerCase()}.
          </p>
        ) : entries.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-slate-600 shadow">
            No {config.title.toLowerCase()} found.
          </p>
        ) : (
          entries.map((entry) => (
            <article
              key={entry.id}
              className="min-w-0 rounded-2xl bg-white p-5 shadow"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-teal-700">{entry.date}</p>
                  <h3 className="break-words text-lg font-semibold">
                    {entry[config.headingField]}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">
                    {entry[config.contentField] || "No description"}
                  </p>
                  <p className="mt-3 break-words text-sm text-slate-700">
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
                    <p className="mt-2 break-words text-sm text-slate-600">
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

function Reports({ user, onUnauthorized, requestScope }) {
  const [recruits, setRecruits] = useState([]);
  const [recruitId, setRecruitId] = useState(
    user.role === "Recruit" ? String(user.id) : "",
  );
  const [criteria, setCriteria] = useState({
    type: "combined",
    start_date: "",
    end_date: "",
    format: "csv",
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [recruitsLoading, setRecruitsLoading] = useState(
    user.role !== "Recruit",
  );
  const reportSelectionRef = useRef({ recruitId, criteria, requestScope });
  const activeDownloadRef = useRef(null);
  const downloadSequenceRef = useRef(0);
  reportSelectionRef.current = { recruitId, criteria, requestScope };

  function currentReportRequestKey() {
    const selection = reportSelectionRef.current;
    return buildReportRequestKey(
      selection.recruitId,
      selection.criteria,
      selection.requestScope,
    );
  }

  function isCurrentDownload(request) {
    return (
      activeDownloadRef.current === request &&
      !request.controller.signal.aborted &&
      request.key === currentReportRequestKey()
    );
  }

  const cancelReportDownload = useCallback(({ updateLoading = true } = {}) => {
    const activeDownload = activeDownloadRef.current;
    if (!activeDownload) {
      return;
    }
    activeDownloadRef.current = null;
    activeDownload.controller.abort();
    if (updateLoading) {
      setDownloading(false);
    }
  }, []);

  useEffect(() => {
    return () => cancelReportDownload({ updateLoading: false });
  }, [cancelReportDownload]);

  useEffect(() => {
    cancelReportDownload();
  }, [cancelReportDownload, requestScope]);

  useEffect(() => {
    if (user.role === "Recruit") {
      return;
    }
    let active = true;
    const path = "/api/diary/recruits";
    const request = acquireInFlightGet(path, requestScope);
    request.promise
      .then((records) => {
        if (!active) {
          return;
        }
        setRecruits(records);
        setRecruitId((current) => current || (records[0] ? String(records[0].id) : ""));
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }
        if (requestError.status === 401) {
          onUnauthorized();
          return;
        }
        setMessage(requestError.message);
      })
      .finally(() => {
        if (active) {
          setRecruitsLoading(false);
        }
      });
    return () => {
      active = false;
      releaseInFlightGet(path, requestScope, request);
    };
  }, [onUnauthorized, requestScope, user.role]);

  function changeCriteria(event) {
    cancelReportDownload();
    setCriteria({ ...criteria, [event.target.name]: event.target.value });
  }

  async function download(event) {
    event.preventDefault();
    cancelReportDownload({ updateLoading: false });
    const requestCriteria = { ...criteria };
    const requestRecruitId = recruitId;
    const requestKey = buildReportRequestKey(
      requestRecruitId,
      requestCriteria,
      requestScope,
    );
    const request = {
      controller: new AbortController(),
      id: downloadSequenceRef.current + 1,
      key: requestKey,
    };
    downloadSequenceRef.current = request.id;
    activeDownloadRef.current = request;
    setErrors({});
    setMessage("");
    setDownloading(true);
    const parameters = new URLSearchParams({
      recruit_id: requestRecruitId,
      type: requestCriteria.type,
      start_date: requestCriteria.start_date,
      end_date: requestCriteria.end_date,
      format: requestCriteria.format,
    });
    try {
      const response = await fetch(`/api/reports?${parameters}`, {
        credentials: "same-origin",
        signal: request.controller.signal,
      });
      if (!isCurrentDownload(request)) {
        return;
      }
      if (!response.ok) {
        throw await responseError(response);
      }
      const blob = await response.blob();
      if (!isCurrentDownload(request)) {
        return;
      }
      const disposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
      const filename =
        filenameMatch?.[1] ||
        `onboarding-diary-report.${requestCriteria.format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      if (!isCurrentDownload(request)) {
        return;
      }
      setMessage(`${requestCriteria.format.toUpperCase()} report downloaded`);
    } catch (requestError) {
      if (!isCurrentDownload(request)) {
        return;
      }
      if (requestError.status === 401) {
        activeDownloadRef.current = null;
        setDownloading(false);
        onUnauthorized();
        return;
      }
      setErrors(requestError.fields || {});
      setMessage(
        requestError.status
          ? requestError.message
          : "Unable to reach the server; please retry",
      );
    } finally {
      if (isCurrentDownload(request)) {
        activeDownloadRef.current = null;
        setDownloading(false);
      }
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="mt-2 text-sm text-slate-600">
          Download authorized diary records for an inclusive date range.
        </p>
      </div>
      <form
        className="grid min-w-0 gap-4 rounded-2xl bg-white p-4 shadow sm:p-6 md:grid-cols-2"
        onSubmit={download}
      >
        {user.role !== "Recruit" ? (
          <div className="md:col-span-2">
            <SelectField
              label="Report Recruit"
              name="recruit_id"
              value={recruitId}
              onChange={(event) => {
                cancelReportDownload();
                setRecruitId(event.target.value);
              }}
              error={errors.recruit_id}
            >
              {recruits.length === 0 ? (
                <option value="">
                  {recruitsLoading ? "Loading recruits" : "No recruits available"}
                </option>
              ) : null}
              {recruits.map((recruit) => (
                <option key={recruit.id} value={recruit.id}>
                  {recruit.name}
                </option>
              ))}
            </SelectField>
          </div>
        ) : null}
        <SelectField
          label="Report type"
          name="type"
          value={criteria.type}
          onChange={changeCriteria}
          error={errors.type}
        >
          <option value="tasks">Tasks</option>
          <option value="issues">Issues</option>
          <option value="feedback">Feedback</option>
          <option value="combined">Combined</option>
        </SelectField>
        <SelectField
          label="Report format"
          name="format"
          value={criteria.format}
          onChange={changeCriteria}
          error={errors.format}
        >
          <option value="csv">CSV</option>
          <option value="pdf">PDF</option>
        </SelectField>
        <Field
          label="Report start date"
          name="start_date"
          type="date"
          value={criteria.start_date}
          onChange={changeCriteria}
          error={errors.start_date}
        />
        <Field
          label="Report end date"
          name="end_date"
          type="date"
          value={criteria.end_date}
          onChange={changeCriteria}
          error={errors.end_date}
        />
        <div className="md:col-span-2">
          <StatusMessage
            message={message}
            tone={
              message.endsWith("downloaded") ? "neutral" : message ? "error" : "neutral"
            }
          />
        </div>
        <button
          className="rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white disabled:bg-slate-400 md:col-span-2"
          type="submit"
          disabled={!recruitId || recruitsLoading || downloading}
        >
          {downloading ? "Preparing report" : "Download report"}
        </button>
      </form>
    </section>
  );
}

function Dashboard({ user, onUnauthorized, requestScope }) {
  const [recruits, setRecruits] = useState([]);
  const [ownerId, setOwnerId] = useState(
    user.role === "Recruit" ? String(user.id) : "",
  );
  const [dashboard, setDashboard] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(user.role === "Recruit");
  const [recruitsLoading, setRecruitsLoading] = useState(
    user.role !== "Recruit",
  );
  const [retryVersion, setRetryVersion] = useState(0);
  const [recruitsRetryable, setRecruitsRetryable] = useState(false);
  const [dashboardRetryable, setDashboardRetryable] = useState(false);

  useEffect(() => {
    if (user.role === "Recruit") {
      return;
    }
    let active = true;
    setRecruitsLoading(true);
    const path = "/api/diary/recruits";
    const request = acquireInFlightGet(path, requestScope);
    request.promise
      .then((records) => {
        if (!active) {
          return;
        }
        setRecruits(records);
        setRecruitsRetryable(false);
        setOwnerId((current) => current || (records[0] ? String(records[0].id) : ""));
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }
        if (requestError.status === 401) {
          onUnauthorized();
          return;
        }
        setMessage(requestError.message);
        setRecruitsRetryable(!requestError.status || requestError.status >= 500);
      })
      .finally(() => {
        if (active) {
          setRecruitsLoading(false);
        }
      });
    return () => {
      active = false;
      releaseInFlightGet(path, requestScope, request);
    };
  }, [onUnauthorized, requestScope, retryVersion, user.role]);

  useEffect(() => {
    if (!ownerId) {
      setDashboard(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setMessage("");
    const path = `/api/dashboard?owner_id=${ownerId}`;
    const request = acquireInFlightGet(path, requestScope);
    request.promise
      .then((response) => {
        if (active) {
          setDashboard(response);
          setDashboardRetryable(false);
        }
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }
        if (requestError.status === 401) {
          onUnauthorized();
          return;
        }
        if ([403, 404].includes(requestError.status)) {
          setDashboard(null);
        }
        setMessage(requestError.message);
        setDashboardRetryable(!requestError.status || requestError.status >= 500);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
      releaseInFlightGet(path, requestScope, request);
    };
  }, [onUnauthorized, ownerId, requestScope, retryVersion]);

  function changeOwner(event) {
    setDashboard(null);
    setMessage("");
    setDashboardRetryable(false);
    setOwnerId(event.target.value);
  }

  const countCards = dashboard
    ? [
        ["Tasks", dashboard.counts.tasks],
        ["Issues", dashboard.counts.issues],
        ["Feedback", dashboard.counts.feedback],
        ["Notes", dashboard.counts.notes],
      ]
    : [];

  return (
    <section className="space-y-8">
      <p className="text-sm font-semibold text-teal-700">{user.role}</p>
      <h1 className="mt-2 break-words text-3xl font-bold sm:text-4xl">
        Welcome, {user.name}
      </h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Review authorized onboarding activity, progress, and open issues.
      </p>

      {user.role !== "Recruit" ? (
        <div className="max-w-sm">
          <SelectField
            label="Dashboard Recruit"
            name="owner_id"
            value={ownerId}
            onChange={changeOwner}
          >
            {recruits.length === 0 ? (
              <option value="">
                {recruitsLoading ? "Loading recruits" : "No recruits available"}
              </option>
            ) : null}
            {recruits.map((recruit) => (
              <option key={recruit.id} value={recruit.id}>
                {recruit.name}
              </option>
            ))}
          </SelectField>
        </div>
      ) : null}

      <StatusMessage
        message={message}
        tone={message === "Access denied" ? "error" : "neutral"}
      />
      {recruitsRetryable || dashboardRetryable ? (
        <button
          className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800"
          type="button"
          onClick={() => setRetryVersion((current) => current + 1)}
        >
          Retry dashboard
        </button>
      ) : null}

      {(loading || recruitsLoading) && !dashboard ? (
        <p className="rounded-2xl bg-white p-6 text-slate-600 shadow">
          Loading dashboard.
        </p>
      ) : !ownerId ? (
        <p className="rounded-2xl bg-white p-6 text-slate-600 shadow">
          No recruits are available for your dashboard.
        </p>
      ) : dashboard ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {countCards.map(([label, count]) => (
              <article
                key={label}
                className="min-w-0 rounded-2xl bg-white p-5 shadow"
              >
                <p className="text-sm font-semibold text-slate-600">{label}</p>
                <p className="mt-2 text-3xl font-bold" aria-label={`${label} count`}>
                  {count}
                </p>
              </article>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="min-w-0 rounded-2xl bg-white p-4 shadow sm:p-6">
              <h2 className="text-xl font-semibold">Task progress</h2>
              <p className="mt-4 text-4xl font-bold text-teal-700">
                {dashboard.task_progress_percent}%
              </p>
              <div
                className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200"
                role="progressbar"
                aria-label="Task completion"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={dashboard.task_progress_percent}
              >
                <div
                  className="h-full bg-teal-600"
                  style={{ width: `${dashboard.task_progress_percent}%` }}
                />
              </div>
            </article>

            <article className="min-w-0 rounded-2xl bg-white p-4 shadow sm:p-6">
              <h2 className="text-xl font-semibold">Open issues</h2>
              <p className="mt-4 text-4xl font-bold text-amber-700">
                {dashboard.open_issue_count}
              </p>
              {dashboard.open_issues.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">No open issues.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {dashboard.open_issues.map((issue) => (
                    <li key={issue.id} className="rounded-lg bg-amber-50 p-3">
                      <p className="break-words font-semibold">{issue.title}</p>
                      <p className="text-sm text-slate-600">
                        {issue.status} · {issue.severity}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>

          <section>
            <h2 className="text-2xl font-semibold">Recent activity</h2>
            {dashboard.recent_activity.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-white p-6 text-slate-600 shadow">
                No diary activity yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {dashboard.recent_activity.map((activity) => (
                  <article
                    key={`${activity.kind}-${activity.id}`}
                    className="min-w-0 rounded-2xl bg-white p-5 shadow"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold capitalize text-teal-700">
                          {activity.kind} · {activity.date}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold">{activity.title}</h3>
                      </div>
                      <p className="text-sm text-slate-600">
                        {activity.status ||
                          activity.feedback_type ||
                          (activity.tags.length > 0 ? "Tagged note" : "Note")}
                      </p>
                    </div>
                    {activity.priority || activity.severity ? (
                      <p className="mt-2 text-sm text-slate-600">
                        {activity.priority
                          ? `Priority: ${activity.priority}`
                          : `Severity: ${activity.severity}`}
                      </p>
                    ) : null}
                    {activity.tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2" aria-label="Note tags">
                        {activity.tags.map((tag, index) => (
                          <span
                            key={index}
                          className="max-w-full whitespace-pre-wrap break-all rounded-full bg-slate-100 px-3 py-1 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
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
  const [saving, setSaving] = useState(false);

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setErrors({});
    setStatus("");
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="max-w-xl">
      <h1 className="text-3xl font-bold">Profile</h1>
      <p className="mt-2 text-sm text-slate-600">
        Role: <strong>{user.role}</strong>
      </p>
      <form
        className="mt-6 min-w-0 space-y-4 rounded-2xl bg-white p-4 shadow sm:p-6"
        onSubmit={submit}
      >
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
          disabled={saving}
        >
          {saving ? "Saving profile" : "Save profile"}
        </button>
      </form>
    </section>
  );
}

function UserEditor({
  user,
  users,
  onChanged,
  onCurrentUserChanged,
  onUnauthorized,
}) {
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
  const [action, setAction] = useState("");
  const managers = users.filter((candidate) => candidate.role === "Manager");

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function save() {
    setErrors({});
    setMessage("");
    setAction("save");
    try {
      const updated = await api(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setMessage("User saved");
      onChanged();
      onCurrentUserChanged(updated);
    } catch (requestError) {
      if (requestError.status === 401) {
        onUnauthorized();
        return;
      }
      setErrors(requestError.fields || {});
      setMessage(requestError.message);
    } finally {
      setAction("");
    }
  }

  async function deleteUser() {
    if (!window.confirm(`Delete ${user.name}?`)) {
      return;
    }
    setMessage("");
    setAction("delete");
    try {
      await api(`/api/admin/users/${user.id}`, { method: "DELETE" });
      onChanged();
    } catch (requestError) {
      if (requestError.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(requestError.message);
    } finally {
      setAction("");
    }
  }

  async function saveAssignment() {
    setMessage("");
    setAction("assignment");
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
      if (requestError.status === 401) {
        onUnauthorized();
        return;
      }
      setMessage(requestError.message);
    } finally {
      setAction("");
    }
  }

  return (
    <article className="min-w-0 space-y-4 rounded-2xl bg-white p-4 shadow sm:p-5">
      <div className="min-w-0">
        <h3 className="break-words text-lg font-semibold">{user.name}</h3>
        <p className="break-all text-sm text-slate-600">
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
            disabled={Boolean(action)}
          >
            {action === "assignment" ? "Saving assignment" : "Save assignment"}
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
          disabled={Boolean(action)}
        >
          {action === "save" ? `Saving user ${user.id}` : `Save user ${user.id}`}
        </button>
        <button
          className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700"
          type="button"
          onClick={deleteUser}
          disabled={Boolean(action)}
        >
          {action === "delete"
            ? `Deleting user ${user.id}`
            : `Delete user ${user.id}`}
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
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [retryable, setRetryable] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await api("/api/admin/users"));
      setRetryable(false);
      return true;
    } catch (requestError) {
      if (requestError.status === 401) {
        onUnauthorized();
        return false;
      }
      if (requestError.status === 403) {
        setUsers([]);
      }
      setMessage(requestError.message);
      setRetryable(!requestError.status || requestError.status >= 500);
      return false;
    } finally {
      setLoading(false);
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
    setCreating(true);
    try {
      await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm(emptyAdminUser);
      setMessage("User created");
      await loadUsers();
    } catch (requestError) {
      if (requestError.status === 401) {
        onUnauthorized();
        return;
      }
      setErrors(requestError.fields || {});
      setMessage(requestError.message);
    } finally {
      setCreating(false);
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
      <form
        className="min-w-0 space-y-4 rounded-2xl bg-white p-4 shadow sm:p-6"
        onSubmit={createUser}
      >
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
          disabled={creating}
        >
          {creating ? "Creating user" : "Create user"}
        </button>
      </form>
      <div className="space-y-4">
        {retryable ? (
          <button
            className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-semibold text-teal-800"
            type="button"
            onClick={loadUsers}
          >
            Retry loading users
          </button>
        ) : null}
        {loading && users.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-slate-600 shadow">
            Loading users.
          </p>
        ) : users.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-slate-600 shadow">
            No users available.
          </p>
        ) : (
          users.map((user) => (
            <UserEditor
              key={user.id}
              user={user}
              users={users}
              onChanged={loadUsers}
              onCurrentUserChanged={maybeUpdateCurrentUser}
              onUnauthorized={onUnauthorized}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("loading");
  const [loginEmail, setLoginEmail] = useState("");
  const [requestScope, setRequestScope] = useState(0);
  const [startupError, setStartupError] = useState("");
  const [shellError, setShellError] = useState("");

  const clearSession = useCallback(() => {
    clearInFlightGetRequests();
    setRequestScope((current) => current + 1);
    setShellError("");
    setUser(null);
    setPage("login");
  }, []);

  const loadProfile = useCallback(() => {
    setStartupError("");
    setPage("loading");
    api("/api/profile")
      .then((profile) => {
        setUser(profile);
        setPage("dashboard");
      })
      .catch((requestError) => {
        if (requestError.status === 401) {
          setPage("login");
          return;
        }
        setStartupError(requestError.message);
        setPage("startup-error");
      });
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function logout() {
    setShellError("");
    try {
      await api("/api/auth/logout", { method: "POST" });
      clearSession();
    } catch (requestError) {
      if (requestError.status === 401) {
        clearSession();
        return;
      }
      setShellError(requestError.message);
    }
  }

  if (page === "loading") {
    return <p className="p-8 text-center text-slate-600">Loading.</p>;
  }
  if (page === "startup-error") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">Unable to load your diary</h1>
          <StatusMessage message={startupError} tone="error" />
          <button
            className="mt-4 rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white"
            type="button"
            onClick={loadProfile}
          >
            Retry
          </button>
        </section>
      </main>
    );
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
          clearInFlightGetRequests();
          setRequestScope((current) => current + 1);
          setShellError("");
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
      onNavigate={(nextPage) => {
        setShellError("");
        setPage(nextPage);
      }}
      onLogout={logout}
      message={shellError}
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
      ) : page === "reports" ? (
        <Reports
          user={user}
          onUnauthorized={clearSession}
          requestScope={requestScope}
        />
      ) : page === "profile" ? (
        <Profile user={user} onUpdated={setUser} onUnauthorized={clearSession} />
      ) : (
        <Dashboard
          user={user}
          onUnauthorized={clearSession}
          requestScope={requestScope}
        />
      )}
    </Shell>
  );
}
