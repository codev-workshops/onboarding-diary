'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/services/api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!token.trim()) newErrors.token = 'Reset token is required.';
    if (!newPassword) {
      newErrors.newPassword = 'New password is required.';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters.';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;

    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', { token: token.trim(), newPassword });
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setApiError(error.response?.data?.message || 'Failed to reset password. The token may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Onboarding Diary</h1>
          <p className="mt-2 text-sm text-gray-600">Set a new password</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {success ? (
            <div className="space-y-4">
              <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                Password reset successfully! You can now sign in with your new password.
              </div>
              <p className="text-center">
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  Go to Login
                </Link>
              </p>
            </div>
          ) : (
            <>
              {apiError && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Reset Token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  error={errors.token}
                  placeholder="Paste your reset token here"
                />
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  error={errors.newPassword}
                  placeholder="Enter new password"
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={errors.confirmPassword}
                  placeholder="Confirm new password"
                />
                <Button type="submit" className="w-full" isLoading={isLoading}>
                  Reset Password
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-gray-600">
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Back to Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
