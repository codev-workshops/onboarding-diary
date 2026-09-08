import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  applyChecklist,
  listAvailableChecklists,
  listChecklistProgress,
} from '../../api/checklists';
import { ApiError } from '../../api/client';
import { buttonClass } from '../../components/FormField';
import { EmptyState, ErrorState, LoadingState } from '../../components/ListState';
import { ChecklistProgressList } from './ChecklistProgressList';

export function RecruitChecklistsPage() {
  const queryClient = useQueryClient();

  const available = useQuery({
    queryKey: ['checklists', 'available'],
    queryFn: listAvailableChecklists,
  });

  const progress = useQuery({
    queryKey: ['checklists', 'progress'],
    queryFn: () => listChecklistProgress(),
  });

  const apply = useMutation({
    mutationFn: applyChecklist,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['checklists'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">Checklists</h1>
      <p className="text-sm text-slate-600">
        Applying a checklist adds its items to your{' '}
        <Link className="underline" to="/tasks">
          tasks
        </Link>
        , dated from your start date. You complete them there, and a checklist can only be applied
        once.
      </p>

      <div>
        <h2 className="text-lg font-semibold">Your checklists</h2>
        {progress.isPending ? <LoadingState label="Loading progress…" /> : null}
        {progress.isError ? (
          <ErrorState
            error={progress.error}
            fallback="Could not load your checklist progress. Try again."
            onRetry={() => void progress.refetch()}
          />
        ) : null}
        {progress.isSuccess ? (
          progress.data.length === 0 ? (
            <div className="mt-3">
              <EmptyState message="You have not applied a checklist yet." />
            </div>
          ) : (
            <div className="mt-3">
              <ChecklistProgressList progress={progress.data} />
            </div>
          )
        ) : null}
      </div>

      <div>
        <h2 className="text-lg font-semibold">Available checklists</h2>

        {apply.isError ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {apply.error instanceof ApiError
              ? apply.error.message
              : 'Could not apply that checklist.'}
          </p>
        ) : null}

        {available.isPending ? <LoadingState label="Loading checklists…" /> : null}
        {available.isError ? (
          <ErrorState
            error={available.error}
            fallback="Could not load the available checklists. Try again."
            onRetry={() => void available.refetch()}
          />
        ) : null}

        {available.isSuccess && available.data.length === 0 ? (
          <div className="mt-3">
            <EmptyState message="No checklists are available for your department yet." />
          </div>
        ) : null}

        {available.isSuccess && available.data.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {available.data.map((template) => (
              <li
                key={template.templateId}
                className="space-y-2 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{template.name}</p>
                    <p className="text-sm text-slate-600">{template.itemCount} items</p>
                  </div>
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={template.applied || apply.isPending}
                    onClick={() => apply.mutate(template.templateId)}
                  >
                    {template.applied ? 'Already applied' : 'Apply checklist'}
                  </button>
                </div>

                {template.description ? (
                  <p className="text-sm text-slate-700">{template.description}</p>
                ) : null}

                <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
                  {template.items.map((item) => (
                    <li key={item.id}>
                      {item.title}{' '}
                      <span className="text-slate-500">
                        ({item.category}
                        {item.dueOffsetDays === null ? '' : `, day ${item.dueOffsetDays}`})
                      </span>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
