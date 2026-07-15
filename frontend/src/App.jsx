import { useEffect, useState } from "react";


const emptySignup = {
  name: "",
  email: "",
  department: "",
  start_date: "",
  password: "",
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
    throw error;
  }
  return body;
}

function Field({ label, name, type = "text", value, onChange, error }) {
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
        required
      />
      {error ? (
        <span id={`${name}-error`} className="mt-1 block text-sm text-red-700">
          {error}
        </span>
      ) : null}
    </label>
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
        {error ? (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}
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
        {message ? (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {message}
          </p>
        ) : null}
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
          <nav className="flex items-center gap-2" aria-label="Main navigation">
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

function Profile({ user, onUpdated }) {
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
        {status ? (
          <p role="status" className="text-sm text-slate-700">
            {status}
          </p>
        ) : null}
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

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("loading");
  const [loginEmail, setLoginEmail] = useState("");

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
    setUser(null);
    setPage("login");
  }

  if (page === "loading") {
    return <p className="p-8 text-center text-slate-600">Loading…</p>;
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
      {page === "profile" ? (
        <Profile user={user} onUpdated={setUser} />
      ) : (
        <Dashboard user={user} />
      )}
    </Shell>
  );
}
