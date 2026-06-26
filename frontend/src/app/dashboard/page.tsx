'use client';

import React from 'react';
import AppShell from '@/components/layout/AppShell';
import Card from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name || 'User'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s an overview of your onboarding progress.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-500 mt-1">Total Tasks</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">0</p>
              <p className="text-sm text-gray-500 mt-1">Completed Tasks</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">0</p>
              <p className="text-sm text-gray-500 mt-1">Open Issues</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">0</p>
              <p className="text-sm text-gray-500 mt-1">Notes</p>
            </div>
          </Card>
        </div>

        <Card title="Recent Activity">
          <p className="text-sm text-gray-500">
            No recent activity. Start by creating your first task entry.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
