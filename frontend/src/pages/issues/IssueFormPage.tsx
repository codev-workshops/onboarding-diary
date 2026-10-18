import { useParams } from 'react-router-dom';
import {
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  isIssueOpen,
  type Issue,
  type IssueSeverity,
  type IssueStatus,
} from '../../api/entries';
import EntryFormShell from '../../components/EntryFormShell';
import Field from '../../components/Field';
import OptionSelect from '../../components/OptionSelect';
import { formatDateTime, today } from '../../dates';
import { useEntryForm } from '../../hooks/useEntryForm';

interface IssueForm {
  entryDate: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  resolutionNotes: string;
}

export default function IssueFormPage() {
  const { id } = useParams();
  const { form, dto, setField, errors, ...state } = useEntryForm<IssueForm, Issue>({
    resource: '/api/issues',
    listPath: '/issues',
    id,
    initial: {
      entryDate: today(),
      title: '',
      description: '',
      severity: 'MEDIUM',
      status: 'OPEN',
      resolutionNotes: '',
    },
    fromDto: (issue) => ({
      ...issue,
      description: issue.description ?? '',
      resolutionNotes: issue.resolutionNotes ?? '',
    }),
  });
  const notesRequired = !isIssueOpen(form.status);

  return (
    <EntryFormShell
      title={id ? 'Edit issue' : 'Log issue'}
      listPath="/issues"
      isEdit={Boolean(id)}
      loading={state.loading}
      saving={state.saving}
      formError={state.formError}
      onSubmit={state.submit}
      onDelete={state.remove}
    >
      <div className="form-row">
        <Field label="Date" htmlFor="entryDate" error={errors.entryDate} required>
          <input id="entryDate" type="date" max={today()} value={form.entryDate} onChange={(e) => setField('entryDate', e.target.value)} required />
        </Field>
        <Field label="Severity" htmlFor="severity" error={errors.severity} required>
          <OptionSelect id="severity" options={ISSUE_SEVERITIES} value={form.severity} onChange={(v) => setField('severity', v as IssueSeverity)} />
        </Field>
      </div>
      <Field label="Title" htmlFor="title" error={errors.title} required>
        <input id="title" maxLength={120} value={form.title} onChange={(e) => setField('title', e.target.value)} required />
      </Field>
      <Field label="Description" htmlFor="description" error={errors.description}>
        <textarea id="description" maxLength={4000} rows={4} value={form.description} onChange={(e) => setField('description', e.target.value)} />
      </Field>
      <Field label="Status" htmlFor="status" error={errors.status} required>
        <OptionSelect id="status" options={ISSUE_STATUSES} value={form.status} onChange={(v) => setField('status', v as IssueStatus)} />
      </Field>
      <Field
        label="Resolution notes"
        htmlFor="resolutionNotes"
        error={errors.resolutionNotes}
        hint={notesRequired ? 'Required for resolved or closed issues.' : undefined}
        required={notesRequired}
      >
        <textarea
          id="resolutionNotes"
          maxLength={4000}
          rows={3}
          value={form.resolutionNotes}
          onChange={(e) => setField('resolutionNotes', e.target.value)}
          required={notesRequired}
        />
      </Field>
      {dto?.resolvedAt && <p className="muted">Resolved {formatDateTime(dto.resolvedAt)}</p>}
    </EntryFormShell>
  );
}
