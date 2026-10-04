import { TextField, Typography } from '@mui/material';
import { useEffect, useState, type FormEvent } from 'react';
import {
  assignManager,
  updateUserProfile,
  updateUserRoles,
  type AdminUser,
  type ManagerOption,
} from '../../api/admin';
import { getErrorMessage } from '../../api/errors';
import type { Role } from '../../api/types';
import { EntryDialog } from '../../components/diary/EntryDialog';
import { ManagerSelect, RoleCheckboxes } from './CreateUserDialog';

interface Props {
  user: AdminUser | null;
  managers: ManagerOption[];
  onClose: () => void;
  onSaved: () => void;
}

function sameRoles(a: Role[], b: Role[]) {
  return a.length === b.length && a.every((role) => b.includes(role));
}

/** Edits profile, roles and manager; only changed parts are sent. */
export function EditUserDialog({ user, managers, onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [managerId, setManagerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.profile.fullName);
      setJobTitle(user.profile.jobTitle ?? '');
      setDepartment(user.profile.department);
      setStartDate(user.profile.startDate);
      setRoles(user.roles);
      setManagerId(user.profile.managerId ? String(user.profile.managerId) : '');
      setError(null);
    }
  }, [user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (!fullName.trim() || !department.trim() || !startDate) {
      setError('Name, department and start date are required');
      return;
    }
    if (roles.length === 0) {
      setError('Pick at least one role');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const profile = user.profile;
      if (
        fullName !== profile.fullName ||
        jobTitle !== (profile.jobTitle ?? '') ||
        department !== profile.department ||
        startDate !== profile.startDate
      ) {
        await updateUserProfile(user.id, {
          fullName: fullName.trim(),
          jobTitle: jobTitle.trim() || undefined,
          department: department.trim(),
          startDate,
        });
      }
      if (!sameRoles(roles, user.roles)) await updateUserRoles(user.id, roles);
      const newManager = managerId ? Number(managerId) : null;
      if (newManager !== profile.managerId) await assignManager(user.id, newManager);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save changes'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EntryDialog
      open={!!user}
      title={`Edit ${user?.profile.fullName ?? 'user'}`}
      error={error}
      submitting={submitting}
      onClose={onClose}
      onSubmit={submit}
    >
      <Typography variant="body2" color="text.secondary">
        {user?.email}
      </Typography>
      <TextField
        label="Full name"
        required
        fullWidth
        margin="dense"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />
      <TextField
        label="Job title"
        fullWidth
        margin="dense"
        value={jobTitle}
        onChange={(e) => setJobTitle(e.target.value)}
      />
      <TextField
        label="Department"
        required
        fullWidth
        margin="dense"
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
      />
      <TextField
        label="Start date"
        type="date"
        required
        fullWidth
        margin="dense"
        InputLabelProps={{ shrink: true }}
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />
      <RoleCheckboxes value={roles} onChange={setRoles} />
      <ManagerSelect
        managers={managers}
        value={managerId}
        onChange={setManagerId}
        excludeId={user?.id}
      />
    </EntryDialog>
  );
}
