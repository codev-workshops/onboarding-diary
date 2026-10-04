import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ROLES,
  fetchManagers,
  listUsers,
  resetUserPassword,
  setUserEnabled,
  type AdminUser,
} from '../../api/admin';
import { getErrorMessage } from '../../api/errors';
import { useAuth } from '../../auth/useAuth';
import { EntryList, type Column } from '../../components/diary/EntryList';
import { FilterBar, SearchFilter } from '../../components/diary/Filters';
import { PageHeader } from '../../components/diary/PageHeader';
import { Toast } from '../../components/diary/Toast';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { enumLabel, formatDateTime } from '../../utils/labels';
import { CreateUserDialog } from './CreateUserDialog';
import { EditUserDialog } from './EditUserDialog';

function RoleChips({ user }: { user: AdminUser }) {
  return (
    <Stack direction="row" gap={0.5} flexWrap="wrap">
      {user.roles.map((role) => (
        <Chip key={role} size="small" label={enumLabel(role)} variant="outlined" />
      ))}
    </Stack>
  );
}

function StatusChips({ user }: { user: AdminUser }) {
  return (
    <Stack direction="row" gap={0.5} flexWrap="wrap">
      <Chip
        size="small"
        label={user.enabled ? 'Active' : 'Disabled'}
        color={user.enabled ? 'success' : 'default'}
      />
      {user.locked && <Chip size="small" label="Locked" color="error" />}
      {user.mustChangePassword && <Chip size="small" label="Temp password" color="warning" />}
    </Stack>
  );
}

const COLUMNS: Column<AdminUser>[] = [
  {
    header: 'User',
    render: (user) => (
      <Box>
        <Typography variant="body2" fontWeight={500}>
          {user.profile.fullName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {user.email}
        </Typography>
      </Box>
    ),
  },
  { header: 'Roles', render: (user) => <RoleChips user={user} />, width: 180 },
  { header: 'Department', render: (user) => user.profile.department, width: 140 },
  { header: 'Manager', render: (user) => user.profile.managerName ?? '—', width: 150 },
  { header: 'Status', render: (user) => <StatusChips user={user} />, width: 160 },
  { header: 'Last login', render: (user) => formatDateTime(user.lastLoginAt), width: 160 },
];

export function AdminUsersPage() {
  const { user: me } = useAuth();
  const filters = useUrlFilters();
  const queryClient = useQueryClient();
  const users = useQuery({
    queryKey: ['admin-users', filters.apiParams],
    queryFn: () => listUsers(filters.apiParams),
    placeholderData: keepPreviousData,
  });
  const managers = useQuery({ queryKey: ['admin-managers'], queryFn: fetchManagers });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-managers'] });
    void queryClient.invalidateQueries({ queryKey: ['team'] });
  };

  const toggleEnabled = async (user: AdminUser) => {
    try {
      await setUserEnabled(user.id, !user.enabled);
      setToast(`${user.profile.fullName} ${user.enabled ? 'disabled' : 'enabled'}`);
      refresh();
    } catch (error) {
      setToast(getErrorMessage(error, 'Could not change status'));
    }
  };

  const confirmReset = async () => {
    if (!resetting) return;
    try {
      const password = await resetUserPassword(resetting.id);
      setIssued({ email: resetting.email, password });
      refresh();
    } catch (error) {
      setToast(getErrorMessage(error, 'Could not reset password'));
    } finally {
      setResetting(null);
    }
  };

  const actions = (user: AdminUser) => {
    const self = user.id === me?.id;
    return (
      <Stack direction="row" justifyContent="flex-end">
        <Tooltip title="Edit">
          <IconButton
            size="small"
            aria-label={`Edit ${user.profile.fullName}`}
            onClick={() => setEditing(user)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Reset password">
          <IconButton
            size="small"
            aria-label={`Reset password for ${user.profile.fullName}`}
            onClick={() => setResetting(user)}
          >
            <LockResetIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={self ? 'You cannot disable yourself' : user.enabled ? 'Disable' : 'Enable'}>
          <span>
            <IconButton
              size="small"
              disabled={self}
              aria-label={`${user.enabled ? 'Disable' : 'Enable'} ${user.profile.fullName}`}
              onClick={() => toggleEnabled(user)}
            >
              {user.enabled ? (
                <BlockIcon fontSize="small" />
              ) : (
                <CheckCircleIcon fontSize="small" color="success" />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    );
  };

  return (
    <Box>
      <PageHeader title="Users" addLabel="New user" onAdd={() => setCreating(true)} />
      <FilterBar>
        <SearchFilter
          label="Search name or email"
          value={filters.value('q')}
          onChange={(q) => filters.update({ q })}
        />
        <TextField
          select
          size="small"
          label="Role"
          value={filters.value('role')}
          onChange={(e) => filters.update({ role: e.target.value })}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All roles</MenuItem>
          {ROLES.map((role) => (
            <MenuItem key={role} value={role}>
              {enumLabel(role)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Status"
          value={filters.value('enabled')}
          onChange={(e) => filters.update({ enabled: e.target.value })}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">Any status</MenuItem>
          <MenuItem value="true">Active</MenuItem>
          <MenuItem value="false">Disabled</MenuItem>
        </TextField>
      </FilterBar>
      <EntryList
        data={users.data}
        isLoading={users.isLoading}
        error={users.error ? getErrorMessage(users.error, 'Could not load users') : null}
        emptyMessage="No users match these filters."
        columns={COLUMNS}
        renderActions={actions}
        renderCard={(user) => (
          <Stack spacing={0.75}>
            <Typography fontWeight={600}>{user.profile.fullName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {user.email} · {user.profile.department}
            </Typography>
            <RoleChips user={user} />
            <StatusChips user={user} />
          </Stack>
        )}
        page={filters.page}
        onPageChange={filters.setPage}
      />
      <CreateUserDialog
        open={creating}
        managers={managers.data ?? []}
        onClose={() => setCreating(false)}
        onCreated={(user, password) => {
          setCreating(false);
          setIssued({ email: user.email, password });
          refresh();
        }}
      />
      <EditUserDialog
        user={editing}
        managers={managers.data ?? []}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setToast(`${editing?.profile.fullName ?? 'User'} updated`);
          setEditing(null);
          refresh();
        }}
      />
      <Dialog open={!!resetting} onClose={() => setResetting(null)}>
        <DialogTitle>Reset password?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {resetting?.profile.fullName} will be logged out everywhere and must set a new password
            using a temporary one.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetting(null)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={confirmReset}>
            Reset password
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!issued} onClose={() => setIssued(null)}>
        <DialogTitle>Temporary password</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Share this with {issued?.email} securely. It is shown only once, and they must change it
            when they log in.
          </Alert>
          <Typography
            component="code"
            fontFamily="monospace"
            fontSize={20}
            data-testid="temporary-password"
          >
            {issued?.password}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => void navigator.clipboard?.writeText(issued?.password ?? '')}>
            Copy
          </Button>
          <Button variant="contained" onClick={() => setIssued(null)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Box>
  );
}
