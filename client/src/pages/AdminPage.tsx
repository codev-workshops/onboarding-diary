import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useCategories, useDepartments, useUsers } from '@/hooks/data';
import { api } from '@/lib/api';
import { ROLES } from '@/lib/constants';
import { cn } from '@/lib/utils';

type Tab = 'users' | 'departments' | 'categories';

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');
  return (
    <div>
      <PageHeader title="Admin" description="Manage users, departments, and task categories." />
      <div className="mb-6 flex gap-1 rounded-md border border-border bg-card p-1">
        {(['users', 'departments', 'categories'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'users' ? <UsersTab /> : tab === 'departments' ? <DepartmentsTab /> : <CategoriesTab />}
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const usersQuery = useUsers();
  const { data: departments } = useDepartments();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Recruit',
    departmentId: '',
    managerId: '',
    startDate: new Date().toISOString().slice(0, 10),
  });

  const managers = usersQuery.data?.filter((u) => u.role === 'Manager' || u.role === 'Admin') ?? [];

  const createMutation = useMutation({
    mutationFn: () =>
      api('/users', {
        method: 'POST',
        body: {
          ...form,
          departmentId: form.departmentId || null,
          managerId: form.managerId || null,
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      setForm({ ...form, name: '', email: '', password: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<void>(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Create user</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <div>
              <Label htmlFor="u-name">Name</Label>
              <Input id="u-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="u-password">Password</Label>
              <Input id="u-password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="u-role">Role</Label>
                <Select id="u-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="u-start">Start date</Label>
                <Input id="u-start" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="u-dept">Department</Label>
                <Select id="u-dept" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                  <option value="">None</option>
                  {departments?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="u-manager">Manager</Label>
                <Select id="u-manager" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
                  <option value="">None</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {createMutation.isError ? (
              <p className="text-sm text-danger" role="alert">
                {(createMutation.error as Error).message}
              </p>
            ) : null}
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create user'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <LoadingState />
          ) : usersQuery.isError ? (
            <ErrorState message={(usersQuery.error as Error).message} />
          ) : usersQuery.data && usersQuery.data.length > 0 ? (
            <ul className="divide-y divide-border">
              {usersQuery.data.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="primary">{u.role}</Badge>
                    <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => deleteMutation.mutate(u.id)}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No users" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DepartmentsTab() {
  const qc = useQueryClient();
  const departmentsQuery = useDepartments();
  const [name, setName] = useState('');

  const createMutation = useMutation({
    mutationFn: () => api('/departments', { method: 'POST', body: { name } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['departments'] });
      setName('');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<void>(`/departments/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['departments'] }),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Add department</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Department name" required />
            <Button type="submit" disabled={createMutation.isPending}>
              Add
            </Button>
          </form>
          {createMutation.isError ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              {(createMutation.error as Error).message}
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent>
          {departmentsQuery.isLoading ? (
            <LoadingState />
          ) : departmentsQuery.data && departmentsQuery.data.length > 0 ? (
            <ul className="divide-y divide-border">
              {departmentsQuery.data.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2">
                  <span>
                    {d.name}{' '}
                    <span className="text-sm text-muted-foreground">
                      ({d._count?.users ?? 0} members)
                    </span>
                  </span>
                  <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => deleteMutation.mutate(d.id)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No departments" />
          )}
          {deleteMutation.isError ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              {(deleteMutation.error as Error).message}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function CategoriesTab() {
  const qc = useQueryClient();
  const categoriesQuery = useCategories();
  const [name, setName] = useState('');

  const createMutation = useMutation({
    mutationFn: () => api('/categories', { method: 'POST', body: { name } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] });
      setName('');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<{ softDisabled: boolean }>(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Add task category</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" required />
            <Button type="submit" disabled={createMutation.isPending}>
              Add
            </Button>
          </form>
          {createMutation.isError ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              {(createMutation.error as Error).message}
            </p>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">
            Deleting a category that is still used by tasks archives it instead of removing it.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {categoriesQuery.isLoading ? (
            <LoadingState />
          ) : categoriesQuery.data && categoriesQuery.data.length > 0 ? (
            <ul className="divide-y divide-border">
              {categoriesQuery.data.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <span>{c.name}</span>
                  <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => deleteMutation.mutate(c.id)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No categories" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
