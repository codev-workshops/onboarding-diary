import { Box, Chip, MenuItem, TextField, Typography, Stack } from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  AUDIT_ACTIONS,
  describeDetails,
  listAuditLog,
  type AuditEntry,
  type AuditUserRef,
} from '../../api/admin';
import { getErrorMessage } from '../../api/errors';
import { EntryList, type Column } from '../../components/diary/EntryList';
import { DateRangeFilter, FilterBar } from '../../components/diary/Filters';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { enumLabel, formatDateTime } from '../../utils/labels';

function who(ref: AuditUserRef | null) {
  if (!ref) return '—';
  return ref.fullName ?? ref.email ?? `User #${ref.id}`;
}

const COLUMNS: Column<AuditEntry>[] = [
  { header: 'When', render: (e) => formatDateTime(e.createdAt), width: 170 },
  {
    header: 'Action',
    render: (e) => <Chip size="small" label={enumLabel(e.action)} />,
    width: 170,
  },
  { header: 'By', render: (e) => who(e.actor), width: 160 },
  { header: 'User', render: (e) => who(e.target), width: 160 },
  {
    header: 'Details',
    render: (e) => (
      <Typography variant="caption" sx={{ wordBreak: 'break-word' }}>
        {describeDetails(e.details)}
      </Typography>
    ),
  },
];

export function AuditLogPage() {
  const filters = useUrlFilters();
  const query = useQuery({
    queryKey: ['audit-log', filters.apiParams],
    queryFn: () => listAuditLog(filters.apiParams),
    placeholderData: keepPreviousData,
  });

  return (
    <Box>
      <Typography variant="h5" component="h1" fontWeight={600} mb={2}>
        Audit log
      </Typography>
      <FilterBar>
        <TextField
          select
          size="small"
          label="Action"
          value={filters.value('action')}
          onChange={(e) => filters.update({ action: e.target.value })}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All actions</MenuItem>
          {AUDIT_ACTIONS.map((action) => (
            <MenuItem key={action} value={action}>
              {enumLabel(action)}
            </MenuItem>
          ))}
        </TextField>
        <DateRangeFilter
          from={filters.value('from')}
          to={filters.value('to')}
          onChange={(range) => filters.update(range)}
        />
      </FilterBar>
      <EntryList
        data={query.data}
        isLoading={query.isLoading}
        error={query.error ? getErrorMessage(query.error, 'Could not load the audit log') : null}
        emptyMessage="No audit entries match these filters."
        columns={COLUMNS}
        renderActions={() => null}
        renderCard={(e) => (
          <Stack spacing={0.5}>
            <Typography fontWeight={600}>{enumLabel(e.action)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(e.createdAt)} · by {who(e.actor)} · {who(e.target)}
            </Typography>
            <Typography variant="caption">{describeDetails(e.details)}</Typography>
          </Stack>
        )}
        page={filters.page}
        onPageChange={filters.setPage}
      />
    </Box>
  );
}
