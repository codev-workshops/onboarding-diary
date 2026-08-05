import DashboardView from '../components/DashboardView';
import { useAuth } from '../auth/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <section>
      <h1>Welcome, {user?.fullName}</h1>
      <p className="muted">
        {user?.department} · started {user?.startDate}
      </p>
      <DashboardView />
    </section>
  );
}
