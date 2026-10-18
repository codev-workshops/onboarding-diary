import { useParams } from 'react-router-dom';
import { FEEDBACK_TYPES, type Feedback, type FeedbackType } from '../../api/entries';
import EntryFormShell from '../../components/EntryFormShell';
import Field from '../../components/Field';
import OptionSelect from '../../components/OptionSelect';
import { today } from '../../dates';
import { useEntryForm } from '../../hooks/useEntryForm';

interface FeedbackForm {
  entryDate: string;
  subject: string;
  type: FeedbackType | '';
  details: string;
}

export default function FeedbackFormPage() {
  const { id } = useParams();
  const { form, setField, errors, ...state } = useEntryForm<FeedbackForm, Feedback>({
    resource: '/api/feedback',
    listPath: '/feedback',
    id,
    initial: { entryDate: today(), subject: '', type: '', details: '' },
    fromDto: (feedback) => ({ ...feedback }),
    toRequest: (form) => ({ ...form, type: form.type || null }),
  });

  return (
    <EntryFormShell
      title={id ? 'Edit feedback' : 'Give feedback'}
      listPath="/feedback"
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
        <Field label="Type" htmlFor="type" error={errors.type} required>
          <OptionSelect id="type" options={FEEDBACK_TYPES} emptyLabel="Choose a type" value={form.type} onChange={(v) => setField('type', v as FeedbackType)} required />
        </Field>
      </div>
      <Field label="Subject" htmlFor="subject" error={errors.subject} required>
        <input id="subject" maxLength={120} value={form.subject} onChange={(e) => setField('subject', e.target.value)} required />
      </Field>
      <Field label="Details" htmlFor="details" error={errors.details} required>
        <textarea id="details" maxLength={4000} rows={5} value={form.details} onChange={(e) => setField('details', e.target.value)} required />
      </Field>
    </EntryFormShell>
  );
}
