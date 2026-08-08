import { useState } from 'react';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { apiFetch, buildQuery } from '../lib/api';
import type { SearchResults } from '../lib/types';

const SECTION_LABELS: Record<keyof SearchResults['results'], string> = {
  tasks: 'Tasks',
  issues: 'Issues',
  feedback: 'Feedback',
  notes: 'Notes',
};

export const SearchPage = () => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [searching, setSearching] = useState(false);

  const run = async () => {
    if (term.trim().length < 2) {
      setError('Please enter at least two characters');
      return;
    }
    setError(undefined);
    setSearching(true);
    try {
      setResults(await apiFetch<SearchResults>(`/search${buildQuery({ q: term.trim() })}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="stack stack--lg">
      <header className="page__header">
        <div>
          <h1>Search</h1>
          <p className="muted">Search across tasks, issues, feedback and notes at once.</p>
        </div>
      </header>

      <Card>
        <form
          className="row"
          onSubmit={(event) => {
            event.preventDefault();
            void run();
          }}
        >
          <div style={{ flex: 1, minWidth: '240px' }}>
            <Input
              label="Search term"
              placeholder="e.g. VPN, handbook, deploy"
              value={term}
              error={error}
              onChange={(event) => setTerm(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={searching}>
            Search entries
          </Button>
        </form>
      </Card>

      {results ? (
        <Card
          title={`${results.total} match${results.total === 1 ? '' : 'es'} for “${results.query}”`}
        >
          <div className="stack">
            {(Object.keys(SECTION_LABELS) as Array<keyof SearchResults['results']>).map((key) => {
              const rows = results.results[key];
              if (rows.length === 0) {
                return null;
              }
              return (
                <div className="stack" key={key}>
                  <p className="overline">
                    {SECTION_LABELS[key]} · {rows.length}
                  </p>
                  <table className="table">
                    <tbody>
                      {rows.map((row) => (
                        <tr key={`${key}-${row.id}`}>
                          <td>{row.date}</td>
                          <td className="table__title">
                            {'title' in row ? row.title : row.subject}
                          </td>
                          <td>
                            <Badge>{SECTION_LABELS[key]}</Badge>
                          </td>
                          <td className="muted">{row.userName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
            {results.total === 0 ? <p className="muted">No entries matched that term.</p> : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
};
