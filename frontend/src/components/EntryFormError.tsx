export default function EntryFormError({ error }: { error: string | null }) {
  return error ? <p className="form-error">{error}</p> : null;
}
