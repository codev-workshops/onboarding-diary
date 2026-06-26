'use client';

import React, { useState, useCallback } from 'react';
import AppShell from '@/components/layout/AppShell';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import api from '@/services/api';
import { UserProfile } from '@/types';
import { formatDate } from '@/utils/formatters';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', department: '' });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' }>({ isVisible: false, message: '', type: 'success' });

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get<UserProfile>('/users/me');
      setProfile(response.data);
      setEditForm({ name: response.data.name, department: response.data.department });
    } catch {
      setToast({ isVisible: true, message: 'Failed to load profile.', type: 'error' });
    }
  }, []);

  const profileRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && !hasFetched) {
        setHasFetched(true);
        fetchProfile();
      }
    },
    [hasFetched, fetchProfile]
  );

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingProfile(true);
    try {
      await api.put('/users/me', editForm);
      await fetchProfile();
      setIsEditing(false);
      setToast({ isVisible: true, message: 'Profile updated.', type: 'success' });
    } catch {
      setToast({ isVisible: true, message: 'Failed to update profile.', type: 'error' });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setToast({ isVisible: true, message: 'Passwords do not match.', type: 'error' });
      return;
    }
    setIsLoadingPassword(true);
    try {
      await api.put('/users/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setToast({ isVisible: true, message: 'Password changed.', type: 'success' });
    } catch {
      setToast({ isVisible: true, message: 'Failed to change password.', type: 'error' });
    } finally {
      setIsLoadingPassword(false);
    }
  };

  return (
    <AppShell>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
      />

      <div ref={profileRef} className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

        <Card title="Personal Information">
          {profile && !isEditing ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Name</span>
                <span className="text-sm font-medium text-gray-900">{profile.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Email</span>
                <span className="text-sm font-medium text-gray-900">{profile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Role</span>
                <span className="text-sm font-medium text-gray-900">{profile.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Department</span>
                <span className="text-sm font-medium text-gray-900">{profile.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Start Date</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(profile.startDate)}</span>
              </div>
              {profile.managerName && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Manager</span>
                  <span className="text-sm font-medium text-gray-900">{profile.managerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Member Since</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(profile.createdAt)}</span>
              </div>
              <div className="pt-2">
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              </div>
            </div>
          ) : profile ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <Input
                label="Name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <Input
                label="Department"
                value={editForm.department}
                onChange={(e) => setEditForm((prev) => ({ ...prev, department: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" isLoading={isLoadingProfile}>
                  Save
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-gray-500">Loading...</p>
          )}
        </Card>

        <Card title="Change Password">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
            />
            <Input
              label="New Password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
              }
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
            />
            <Button type="submit" size="sm" isLoading={isLoadingPassword}>
              Change Password
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
