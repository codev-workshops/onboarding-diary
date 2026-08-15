import { MenuItem, TextField } from '@mui/material';
import { useAuth } from '../auth/auth-context';
import { useRecruits } from './api';
import { useRecruitContext } from './recruit-context';

export function RecruitSelector() {
  const { hasRole } = useAuth();
  const canOversee = hasRole(['Manager', 'Admin']);
  const { data: recruits } = useRecruits(canOversee);
  const { recruitId, setRecruitId } = useRecruitContext();

  if (!canOversee) {
    return null;
  }

  return (
    <TextField
      select
      size="small"
      label="Viewing"
      value={recruitId ?? 'me'}
      onChange={(event) => setRecruitId(event.target.value === 'me' ? null : Number(event.target.value))}
      sx={{ minWidth: 200, backgroundColor: 'background.paper', borderRadius: 1 }}
    >
      <MenuItem value="me">My diary</MenuItem>
      {(recruits ?? []).map((recruit) => (
        <MenuItem key={recruit.id} value={recruit.id}>
          {recruit.fullName}
        </MenuItem>
      ))}
    </TextField>
  );
}
