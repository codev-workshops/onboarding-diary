import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRecruit } from '../api/recruitApi';
import { getMilestones, createMilestone } from '../api/milestoneApi';
import MilestoneForm from '../components/MilestoneForm';

function MilestonePage() {
  const { id } = useParams();
  const [recruit, setRecruit] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  const loadMilestones = useCallback(() => {
    getMilestones(id)
      .then((res) => setMilestones(res.data))
      .catch(() => setError('Failed to load milestones.'));
  }, [id]);

  useEffect(() => {
    getRecruit(id)
      .then((res) => setRecruit(res.data))
      .catch(() => setError('Failed to load recruit.'));
    loadMilestones();
  }, [id, loadMilestones]);

  const handleCreate = (data) => {
    createMilestone(id, data)
      .then(() => {
        setShowForm(false);
        loadMilestones();
      })
      .catch(() => setError('Failed to create milestone.'));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/" className="muted">
            &larr; Dashboard
          </Link>
          <h1>{recruit ? `${recruit.name}'s Milestones` : 'Milestones'}</h1>
        </div>
        <div className="header-actions">
          {recruit && (
            <Link to={`/recruits/${id}/diary`} className="btn btn-sm">
              Diary
            </Link>
          )}
          <button
            className="btn btn-primary"
            onClick={() => setShowForm((s) => !s)}
          >
            {showForm ? 'Close' : 'Add Milestone'}
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {showForm && (
        <MilestoneForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {milestones.length === 0 && <p>No milestones yet.</p>}

      <div className="card-grid">
        {milestones.map((milestone) => (
          <div key={milestone.id} className="card milestone-card">
            <h3>{milestone.title}</h3>
            <p>{milestone.description}</p>
            <p className="muted">Achieved: {milestone.achievedDate || 'N/A'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MilestonePage;
