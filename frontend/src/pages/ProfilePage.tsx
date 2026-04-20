import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Alert,
  Divider,
  Avatar,
} from '@mui/material';
import { useAuthStore } from '@/store/authStore';
import { userService } from '@/services/userService';
import { authService } from '@/services/authService';
import { User } from '@/types/auth';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function ProfilePage() {
  const authUser = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const token = useAuthStore((s) => s.token);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({ name: '', department: '', bio: '', profileImageUrl: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    userService
      .getCurrentUser()
      .then((u) => {
        setUser(u);
        setProfileForm({
          name: u.name || '',
          department: u.department || '',
          bio: u.bio || '',
          profileImageUrl: u.profileImageUrl || '',
        });
      })
      .catch(() => {
        if (authUser) {
          setUser(authUser);
          setProfileForm({
            name: authUser.name || '',
            department: authUser.department || '',
            bio: authUser.bio || '',
            profileImageUrl: authUser.profileImageUrl || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [authUser]);

  const handleProfileSave = async () => {
    setSaving(true);
    setProfileSuccess('');
    setProfileError('');
    try {
      const updated = await userService.updateProfile(profileForm);
      setUser(updated);
      if (token) {
        login(token, updated);
      }
      setProfileSuccess('Profile updated successfully');
    } catch {
      setProfileError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setChangingPassword(true);
    setPasswordSuccess('');
    setPasswordError('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      setChangingPassword(false);
      return;
    }
    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      setPasswordError('Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar
                  src={profileForm.profileImageUrl}
                  sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: '1.5rem' }}
                >
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="h6">{user?.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.email} &middot; {user?.role}
                  </Typography>
                </Box>
              </Box>

              {profileSuccess && <Alert severity="success" sx={{ mb: 2 }}>{profileSuccess}</Alert>}
              {profileError && <Alert severity="error" sx={{ mb: 2 }}>{profileError}</Alert>}

              <TextField
                label="Name"
                fullWidth
                value={profileForm.name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Department"
                fullWidth
                value={profileForm.department}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, department: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Bio"
                fullWidth
                multiline
                rows={3}
                value={profileForm.bio}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, bio: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Avatar URL"
                fullWidth
                value={profileForm.profileImageUrl}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, profileImageUrl: e.target.value }))}
                sx={{ mb: 3 }}
              />
              <Button variant="contained" onClick={handleProfileSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Change Password
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {passwordSuccess && <Alert severity="success" sx={{ mb: 2 }}>{passwordSuccess}</Alert>}
              {passwordError && <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>}

              <TextField
                label="Current Password"
                type="password"
                fullWidth
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <TextField
                label="New Password"
                type="password"
                fullWidth
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Confirm New Password"
                type="password"
                fullWidth
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                sx={{ mb: 3 }}
              />
              <Button variant="contained" onClick={handlePasswordChange} disabled={changingPassword}>
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
