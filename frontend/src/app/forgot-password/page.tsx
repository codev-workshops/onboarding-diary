'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import api from '@/services/api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { isValidEmail } from '@/utils/validators';

interface ForgotPasswordResponse {
  message: string;
  token: string | null;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ForgotPasswordResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!email) {
      setError('Email is required.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post<ForgotPasswordResponse>('/auth/forgot-password', { email });
      setResult(response.data);
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Onboarding Diary</h1>
          <p className="mt-2 text-sm text-gray-600">Reset your password</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {result ? (
            <div className="space-y-4">
              <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                {result.message}
              </div>
              {result.token && (
                <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
                  <p className="text-sm font-medium text-blue-800 mb-1">Reset Token (for testing):</p>
                  <p className="text-xs font-mono text-blue-700 break-all select-all bg-blue-100 p-2 rounded">
                    {result.token}
                  </p>
                  <Link
                    href={`/reset-password?token=${result.token}`}
                    className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Go to Reset Password page
                  </Link>
                </div>
              )}
              <p className="text-center text-sm text-gray-600">
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Back to Login
                </Link>
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <p className="mb-4 text-sm text-gray-600">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <Button type="submit" className="w-full" isLoading={isLoading}>
                  Send Reset Link
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-gray-600">
                Remember your password?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
