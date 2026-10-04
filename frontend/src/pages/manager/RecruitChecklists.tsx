import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchRecruitChecklists } from '../../api/checklists';
import { getErrorMessage } from '../../api/errors';
import { ChecklistCard } from '../../components/checklists/ChecklistCard';

/** Read-only view of a recruit's checklists for their manager. */
export function RecruitChecklists({ recruitId }: { recruitId: number }) {
  const checklists = useQuery({
    queryKey: ['recruit', recruitId, 'checklists'],
    queryFn: () => fetchRecruitChecklists(recruitId),
  });
  if (checklists.isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }
  if (checklists.error) {
    return (
      <Alert severity="error">
        {getErrorMessage(checklists.error, 'Could not load checklists')}
      </Alert>
    );
  }
  if (!checklists.data?.length) {
    return <Typography color="text.secondary">No checklists assigned.</Typography>;
  }
  return (
    <Stack spacing={2}>
      {checklists.data.map((checklist) => (
        <ChecklistCard key={checklist.id} checklist={checklist} />
      ))}
    </Stack>
  );
}
