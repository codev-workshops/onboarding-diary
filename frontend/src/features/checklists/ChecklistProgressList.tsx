import type { ChecklistProgress } from '../../api/checklists';

/** Read-only progress of each applied checklist; used by the recruit, the dashboard and the team view. */
export function ChecklistProgressList({ progress }: { progress: ChecklistProgress[] }) {
  return (
    <ul className="space-y-3">
      {progress.map((checklist) => (
        <li
          key={checklist.assignmentId}
          className="space-y-2 rounded-lg border border-slate-200 bg-white p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{checklist.templateName}</p>
            <p className="text-sm text-slate-600">
              {checklist.completedTasks} of {checklist.generatedTasks} tasks done ·{' '}
              {checklist.completionPercentage}%
            </p>
          </div>
          <div
            role="progressbar"
            aria-label={`${checklist.templateName} completion`}
            aria-valuenow={checklist.completionPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full bg-slate-900"
              style={{ width: `${checklist.completionPercentage}%` }}
            />
          </div>
          {checklist.generatedTasks === 0 ? (
            <p className="text-xs text-slate-500">
              No generated tasks remain — the checklist stays applied and cannot be applied again.
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
