import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { feedbackApi, issuesApi, notesApi, tasksApi } from '../api/entries';
import { getUser } from '../api/users';
import type { FeedbackResponse, IssueResponse, NoteResponse, TaskResponse, User } from '../api/types';
import DashboardView from '../components/DashboardView';

/// Read-only view of one recruit's diary, used by managers and admins.
export default function RecruitDiaryPage() {
  const { userId = '' } = useParams();
  const [recruit, setRecruit] = useState<User | null>(null);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [issues, setIssues] = useState<IssueResponse[]>([]);
  const [feedback, setFeedback] = useState<FeedbackResponse[]>([]);
  const [notes, setNotes] = useState<NoteResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const params = { userId };
    Promise.all([
      getUser(userId),
      tasksApi.list(params),
      issuesApi.list(params),
      feedbackApi.list(params),
      notesApi.list(params),
    ])
      .then(([loadedUser, loadedTasks, loadedIssues, loadedFeedback, loadedNotes]) => {
        setRecruit(loadedUser);
        setTasks(loadedTasks);
        setIssues(loadedIssues);
        setFeedback(loadedFeedback);
        setNotes(loadedNotes);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Failed to load diary'));
  }, [userId]);

  if (error) return <p className="form-error">{error}</p>;
  if (!recruit) return <p className="muted">Loading…</p>;

  return (
    <section>
      <h1>{recruit.fullName}</h1>
      <p className="muted">
        {recruit.department} · started {recruit.startDate} · read-only
      </p>

      <DashboardView userId={userId} />

      <div className="card">
        <h2>Tasks</h2>
        {tasks.length === 0 ? (
          <p className="muted">No tasks.</p>
        ) : (
          <ul className="entry-list plain">
            {tasks.map((task) => (
              <li key={task.id}>
                <strong>{task.title}</strong>
                <span className="muted">
                  {' '}
                  · {task.date} · {task.category} · {task.status} · {task.priority}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Issues</h2>
        {issues.length === 0 ? (
          <p className="muted">No issues.</p>
        ) : (
          <ul className="entry-list plain">
            {issues.map((issue) => (
              <li key={issue.id}>
                <strong>{issue.title}</strong>
                <span className="muted">
                  {' '}
                  · {issue.date} · {issue.severity} · {issue.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Feedback</h2>
        {feedback.length === 0 ? (
          <p className="muted">No feedback.</p>
        ) : (
          <ul className="entry-list plain">
            {feedback.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.subject}</strong>
                <span className="muted">
                  {' '}
                  · {entry.date} · {entry.type}
                </span>
                <p>{entry.details}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Notes</h2>
        {notes.length === 0 ? (
          <p className="muted">No notes.</p>
        ) : (
          <ul className="entry-list plain">
            {notes.map((note) => (
              <li key={note.id}>
                <strong>{note.title}</strong>
                <span className="muted"> · {note.date}</span>
                <p>{note.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
