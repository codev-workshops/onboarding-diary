import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createRecruit } from '../api/recruitApi';

const initialState = {
  name: '',
  email: '',
  department: '',
  joinDate: '',
};

function CreateRecruitPage() {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    createRecruit({
      ...form,
      joinDate: form.joinDate || null,
    })
      .then(() => navigate('/'))
      .catch(() => {
        setError('Failed to create recruit. Check the fields and try again.');
        setSubmitting(false);
      });
  };

  return (
    <div className="form-page">
      <div className="page-header">
        <h1>Add New Recruit</h1>
        <Link to="/" className="btn btn-sm">
          Back
        </Link>
      </div>

      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit} className="card form">
        <label>
          Name
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Department
          <input
            type="text"
            name="department"
            value={form.department}
            onChange={handleChange}
          />
        </label>
        <label>
          Join Date
          <input
            type="date"
            name="joinDate"
            value={form.joinDate}
            onChange={handleChange}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Create Recruit'}
        </button>
      </form>
    </div>
  );
}

export default CreateRecruitPage;
