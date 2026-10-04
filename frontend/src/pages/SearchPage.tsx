import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Link,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Fragment } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import type { RecentEntryType } from '../api/dashboard';
import { getErrorMessage } from '../api/errors';
import { MIN_SEARCH_LENGTH, searchEntries, type SearchHit, type SearchScope } from '../api/search';
import { useAuth } from '../auth/useAuth';
import { EnumChip } from '../components/diary/EnumChip';
import { formatDate } from '../utils/labels';

const LOGS: Record<RecentEntryType, { path: string; label: string }> = {
  TASK: { path: 'tasks', label: 'Tasks' },
  ISSUE: { path: 'issues', label: 'Issues' },
  FEEDBACK: { path: 'feedback', label: 'Feedback' },
  NOTE: { path: 'notes', label: 'Notes' },
};

function Highlight({ text, query }: { text: string; query: string }) {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index}>{part}</mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function hitLink(hit: SearchHit, scope: SearchScope): string {
  const base = scope === 'TEAM' ? `/team/${hit.ownerId}/` : '/';
  const day = new URLSearchParams({ from: hit.entryDate, to: hit.entryDate });
  return `${base}${LOGS[hit.type].path}?${day}`;
}

export function SearchPage() {
  const { hasRole } = useAuth();
  const [params, setParams] = useSearchParams();
  const canSearchTeam = hasRole('MANAGER', 'ADMIN');
  const q = (params.get('q') ?? '').trim();
  const scope: SearchScope = canSearchTeam && params.get('scope') === 'TEAM' ? 'TEAM' : 'SELF';
  const tooShort = q.length < MIN_SEARCH_LENGTH;

  const results = useQuery({
    queryKey: ['search', q, scope],
    queryFn: () => searchEntries(q, scope),
    enabled: !tooShort,
  });

  const changeScope = (next: SearchScope | null) => {
    if (!next) return;
    const updated = new URLSearchParams(params);
    if (next === 'TEAM') updated.set('scope', 'TEAM');
    else updated.delete('scope');
    setParams(updated);
  };

  const groups = results.data?.groups ?? [];
  const total = groups.reduce((sum, group) => sum + group.total, 0);

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        gap={1}
        mb={2}
      >
        <Typography variant="h5" component="h1" fontWeight={600}>
          {q ? `Search results for “${q}”` : 'Search'}
        </Typography>
        {canSearchTeam && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={scope}
            onChange={(_, next) => changeScope(next)}
            aria-label="Search scope"
          >
            <ToggleButton value="SELF">My entries</ToggleButton>
            <ToggleButton value="TEAM">My team</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Stack>

      {tooShort ? (
        <Typography color="text.secondary">
          Type at least {MIN_SEARCH_LENGTH} characters in the search box to search tasks, issues,
          feedback and notes.
        </Typography>
      ) : results.isLoading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress aria-label="Searching" />
        </Box>
      ) : results.error ? (
        <Alert severity="error">{getErrorMessage(results.error, 'Search failed')}</Alert>
      ) : total === 0 ? (
        <Typography color="text.secondary">Nothing matches “{q}”.</Typography>
      ) : (
        <Stack spacing={2}>
          {scope === 'TEAM' && (
            <Typography variant="caption" color="text.secondary">
              Private notes are never included in team searches.
            </Typography>
          )}
          {groups
            .filter((group) => group.total > 0)
            .map((group) => (
              <Card key={group.type}>
                <CardContent>
                  <Typography variant="h6" component="h2">
                    {LOGS[group.type].label} ({group.total})
                  </Typography>
                  {group.hits.map((hit, index) => (
                    <Box key={hit.id}>
                      {index > 0 && <Divider />}
                      <Box py={1.25}>
                        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                          <Link component={RouterLink} to={hitLink(hit, scope)} fontWeight={600}>
                            <Highlight text={hit.title} query={q} />
                          </Link>
                          {hit.status && <EnumChip value={hit.status} />}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(hit.entryDate)}
                          {scope === 'TEAM' && hit.ownerName ? ` · ${hit.ownerName}` : ''}
                        </Typography>
                        {hit.snippet && (
                          <Typography variant="body2" color="text.secondary">
                            <Highlight text={hit.snippet} query={q} />
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))}
                  {group.total > group.hits.length && (
                    <Typography variant="caption" color="text.secondary">
                      Showing {group.hits.length} of {group.total}. Refine your search to narrow it
                      down.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))}
        </Stack>
      )}
    </Box>
  );
}
