import { useState } from 'react';
import type { FormEvent } from 'react';
import { apiFetch } from '../api/client';
import type { SearchResult } from '../api/types';

export default function SearchPage() {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      setResults(await apiFetch<SearchResult[]>(`/api/search?q=${encodeURIComponent(term)}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Search failed');
    }
  }

  return (
    <section>
      <h1>Search</h1>
      <form className="card" onSubmit={handleSubmit}>
        <label htmlFor="term">Search your diary</label>
        <input id="term" value={term} required placeholder="Tasks, issues, feedback, notes" onChange={(e) => setTerm(e.target.value)} />
        <button type="submit">Search</button>
      </form>

      {error && <p className="form-error">{error}</p>}
      {results && (results.length === 0 ? (
        <p className="muted">No matches.</p>
      ) : (
        <ul className="entry-list">
          {results.map((result) => (
            <li key={`${result.kind}-${result.id}`} className="card">
              <h3>{result.title}</h3>
              <p className="muted">
                {result.kind} · {result.date}
              </p>
              <p>{result.snippet}</p>
            </li>
          ))}
        </ul>
      ))}
    </section>
  );
}
