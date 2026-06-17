import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRecruits } from '../api/recruitApi';

function Dashboard() {
  const [recruits, setRecruits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getRecruits()
      .then((res) => setRecruits(res.data))
      .catch(() => setError('Failed to load recruits. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Recruits</h1>
        <Link to="/recruits/new" className="btn btn-primary">
          Add New Recruit
        </Link>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && recruits.length === 0 && (
        <p>No recruits yet. Add your first recruit to get started.</p>
      )}

      <div className="card-grid">
        {recruits.map((recruit) => (
          <div
            key={recruit.id}
            className="card recruit-card"
            onClick={() => navigate(`/recruits/${recruit.id}/diary`)}
          >
            <h3>{recruit.name}</h3>
            <p className="muted">{recruit.department || 'No department'}</p>
            <p className="muted">
              Joined: {recruit.joinDate || 'N/A'}
            </p>
            <div className="card-actions">
              <Link
                to={`/recruits/${recruit.id}/diary`}
                onClick={(e) => e.stopPropagation()}
                className="btn btn-sm"
              >
                Diary
              </Link>
              <Link
                to={`/recruits/${recruit.id}/milestones`}
                onClick={(e) => e.stopPropagation()}
                className="btn btn-sm"
              >
                Milestones
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
