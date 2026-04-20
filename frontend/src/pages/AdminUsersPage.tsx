import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import IconButton from '@mui/material/IconButton';
import DataTable, { Column } from '@/components/common/DataTable';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import { userService } from '@/services/userService';
import { User, Role } from '@/types/auth';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#F44336',
  MANAGER: '#FF9800',
  RECRUIT: '#2196F3',
};

const ROLES: Role[] = ['RECRUIT', 'MANAGER', 'ADMIN'];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<string>('');

  const fetchUsers = useCallback(() => {
    setLoading(true);
    userService
      .listUsers(page, rowsPerPage)
      .then((res) => {
        setUsers(res.content);
        setTotalCount(res.totalElements);
      })
      .catch(() => {
        setUsers([]);
        setTotalCount(0);
      })
      .finally(() => setLoading(false));
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingUser) return;
    try {
      await userService.adminUpdateUser(editingUser.id, { role: editRole });
      setEditDialogOpen(false);
      fetchUsers();
    } catch {
      // error handling
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      if (user.active) {
        await userService.deactivateUser(user.id);
      } else {
        await userService.activateUser(user.id);
      }
      fetchUsers();
    } catch {
      // error handling
    }
  };

  const columns: Column<User>[] = [
    { id: 'name', label: 'Name', render: (row) => row.name },
    { id: 'email', label: 'Email', render: (row) => row.email },
    {
      id: 'role',
      label: 'Role',
      render: (row) => (
        <Chip
          label={row.role}
          size="small"
          sx={{ backgroundColor: ROLE_COLORS[row.role] || '#9E9E9E', color: '#fff', fontWeight: 600 }}
        />
      ),
    },
    { id: 'department', label: 'Department', render: (row) => row.department || '-' },
    {
      id: 'active',
      label: 'Status',
      render: (row) => (
        <Chip
          label={row.active ? 'Active' : 'Inactive'}
          size="small"
          color={row.active ? 'success' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (row) => (
        <Box>
          <IconButton size="small" onClick={() => openEdit(row)} color="primary" title="Edit role">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleToggleActive(row)}
            color={row.active ? 'error' : 'success'}
            title={row.active ? 'Deactivate' : 'Activate'}
          >
            {row.active ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">User Management</Typography>
        <Button variant="contained" startIcon={<PersonAddIcon />} disabled>
          Add User
        </Button>
      </Box>

      {loading ? (
        <LoadingSpinner />
      ) : users.length === 0 ? (
        <EmptyState message="No users found" />
      ) : (
        <DataTable
          columns={columns}
          rows={users}
          page={page}
          rowsPerPage={rowsPerPage}
          totalCount={totalCount}
          onPageChange={setPage}
          onRowsPerPageChange={(rpp) => { setRowsPerPage(rpp); setPage(0); }}
          getRowKey={(r) => r.id}
        />
      )}

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit User Role</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {editingUser?.name} ({editingUser?.email})
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select value={editRole} label="Role" onChange={(e: SelectChangeEvent) => setEditRole(e.target.value)}>
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
