import { useState } from 'react';

const emptyMilestone = {
  title: '',
  description: '',
  achievedDate: '',
};

function MilestoneForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState(emptyMilestone);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      title: form.title,
      description: form.description,
      achievedDate: form.achievedDate || null,
    });
    setForm(emptyMilestone);
  };

  return (
    <form onSubmit={handleSubmit} className="card form">
      <h3>Add Milestone</h3>
      <label>
        Title
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        Description
        <textarea
          name="description"
          rows="3"
          value={form.description}
          onChange={handleChange}
        />
      </label>
      <label>
        Achieved Date
        <input
          type="date"
          name="achievedDate"
          value={form.achievedDate}
          onChange={handleChange}
        />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Save
        </button>
        {onCancel && (
          <button type="button" className="btn btn-sm" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default MilestoneForm;
