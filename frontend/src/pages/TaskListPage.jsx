import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTasks, deleteTask } from '../api/taskApi';
import FilterBar from '../components/FilterBar';
import StatusBadge from '../components/StatusBadge';

export default function TaskListPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({});
  const navigate = useNavigate();
  const isRecruit = user?.role === 'RECRUIT';

  const loadTasks = () => {
    getTasks(filters).then(res => setTasks(res.data)).catch(console.error);
  };

  useEffect(() => { loadTasks(); }, [filters]);

  const handleDelete = async (id) => {
    if (window.confirm('Delete this task?')) {
      await deleteTask(id);
      loadTasks();
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value || undefined }));
  };

  const filterConfig = [
    { name: 'dateFrom', label: 'From', type: 'date' },
    { name: 'dateTo', label: 'To', type: 'date' },
    { name: 'category', label: 'Category', type: 'select', options: ['Training', 'Documentation', 'Development', 'Meeting', 'Other'] },
    { name: 'status', label: 'Status', type: 'select', options: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DEFERRED'] },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h2>Tasks</h2>
        {isRecruit && <button className="btn btn-primary" onClick={() => navigate('/tasks/new')}>New Task</button>}
      </div>
      <FilterBar filters={filters} onFilterChange={handleFilterChange} filterConfig={filterConfig} />
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Priority</th>
              {isRecruit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <tr key={task.id}>
                <td>{task.date}</td>
                <td>{task.title}</td>
                <td>{task.category}</td>
                <td><StatusBadge value={task.status} /></td>
                <td><StatusBadge value={task.priority} /></td>
                {isRecruit && (
                  <td className="actions">
                    <button className="btn btn-sm btn-edit" onClick={() => navigate(`/tasks/${task.id}/edit`)}>Edit</button>
                    <button className="btn btn-sm btn-delete" onClick={() => handleDelete(task.id)}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr><td colSpan="6" className="empty">No tasks found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
