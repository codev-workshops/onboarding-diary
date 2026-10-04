import { Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface Props {
  title: string;
  addLabel: string;
  onAdd: () => void;
}

export function PageHeader({ title, addLabel, onAdd }: Props) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} gap={1}>
      <Typography variant="h5" component="h1" fontWeight={600}>
        {title}
      </Typography>
      <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
        {addLabel}
      </Button>
    </Stack>
  );
}
