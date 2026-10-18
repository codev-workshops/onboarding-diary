import { useAuth } from '../auth/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <>
      <div className="page-header">
        <h1>Welcome, {user?.name}</h1>
      </div>
      <p className="muted">Your onboarding dashboard will appear here.</p>
    </>
  );
}
