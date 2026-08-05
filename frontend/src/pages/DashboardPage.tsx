import { useAuth } from '../auth/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <section>
      <h1>Welcome, {user?.fullName}</h1>
      <p className="muted">
        {user?.department} · started {user?.startDate}
      </p>
      <div className="card">
        <p>
          Your task log, issue log, feedback, notes and reports will appear here as those sections are built.
        </p>
      </div>
    </section>
  );
}
