import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listRecruits } from '../api/users';
import type { User } from '../api/types';
import { useAuth } from '../auth/AuthContext';

export default function TeamPage() {
  const { user } = useAuth();
  const [recruits, setRecruits] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listRecruits(user.id)
      .then(setRecruits)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Failed to load recruits'));
  }, [user]);

  return (
    <section>
      <h1>My recruits</h1>
      {error && <p className="form-error">{error}</p>}
      {recruits.length === 0 ? (
        <p className="muted">No recruits are assigned to you yet.</p>
      ) : (
        <table className="entry-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Department</th>
              <th>Start date</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {recruits.map((recruit) => (
              <tr key={recruit.id}>
                <td>{recruit.fullName}</td>
                <td>{recruit.department}</td>
                <td>{recruit.startDate}</td>
                <td>
                  <Link to={`/team/${recruit.id}`}>View diary</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
