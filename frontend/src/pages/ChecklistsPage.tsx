import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchMyChecklists, setChecklistItem, type ChecklistAssignment } from '../api/checklists';
import { getErrorMessage } from '../api/errors';
import { ChecklistCard } from '../components/checklists/ChecklistCard';

const QUERY_KEY = ['checklists', 'mine'];

export function ChecklistsPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const checklists = useQuery({ queryKey: QUERY_KEY, queryFn: fetchMyChecklists });
  const toggle = useMutation({
    mutationFn: (vars: { assignmentId: number; itemId: number; completed: boolean }) =>
      setChecklistItem(vars.assignmentId, vars.itemId, vars.completed),
    onMutate: () => setError(null),
    onSuccess: (updated) =>
      queryClient.setQueryData<ChecklistAssignment[]>(QUERY_KEY, (old) =>
        old?.map((checklist) => (checklist.id === updated.id ? updated : checklist)),
      ),
    onError: (err) => setError(getErrorMessage(err, 'Could not update the checklist')),
  });

  return (
    <Box>
      <Typography variant="h5" component="h1" fontWeight={600} mb={2}>
        My checklists
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {checklists.isLoading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress aria-label="Loading" />
        </Box>
      ) : checklists.error ? (
        <Alert severity="error">
          {getErrorMessage(checklists.error, 'Could not load your checklists')}
        </Alert>
      ) : !checklists.data?.length ? (
        <Typography color="text.secondary">
          No checklists have been assigned to you yet. Your admin assigns them, for example an
          “Engineering week 1” list.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {checklists.data.map((checklist) => (
            <ChecklistCard
              key={checklist.id}
              checklist={checklist}
              pendingItemId={toggle.isPending ? toggle.variables?.itemId : null}
              onToggle={(item, completed) =>
                toggle.mutate({ assignmentId: checklist.id, itemId: item.id, completed })
              }
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
