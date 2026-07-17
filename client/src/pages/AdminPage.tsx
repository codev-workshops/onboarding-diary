import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader } from '@/components/PageHeader';
import { PasswordField } from '@/components/PasswordField';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { useCategories, useDepartments, useTemplates, useUsers } from '@/hooks/data';
import { api } from '@/lib/api';
import { DEFAULT_TIMEZONE, ROLES, TASK_PRIORITIES, timezoneOptions } from '@/lib/constants';
import type { ChecklistTemplate, Department, TaskCategory, User } from '@/lib/types';
import { cn, formatTimezone } from '@/lib/utils';

type Tab = 'users' | 'departments' | 'categories' | 'templates';

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');
  return (
    <div>
      <PageHeader title="Admin" description="Manage users, departments, categories, and templates." />
      <div className="mb-6 flex gap-1 rounded-md border border-border bg-card p-1">
        {(['users', 'departments', 'categories', 'templates'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            data-tour={`admin-tab-${t}`}
            className={cn(
              'flex-1 rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'users' ? (
        <UsersTab />
      ) : tab === 'departments' ? (
        <DepartmentsTab />
      ) : tab === 'categories' ? (
        <CategoriesTab />
      ) : (
        <TemplatesTab />
      )}
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const usersQuery = useUsers();
  const { data: departments } = useDepartments();
  const { data: templates } = useTemplates();
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Recruit',
    departmentId: '',
    managerId: '',
    templateId: '',
    timezone: DEFAULT_TIMEZONE,
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
          templateId: form.role === 'Recruit' && form.templateId ? form.templateId : null,
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      void qc.invalidateQueries({ queryKey: ['tasks'] });
      setForm({ ...form, name: '', email: '', password: '', templateId: '' });
      toast.success('User created');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<void>(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      setConfirmDelete(null);
      toast.success('User deleted');
    },
    onError: (e) => {
      setConfirmDelete(null);
      toast.error((e as Error).message);
    },
  });

  const [editing, setEditing] = useState<User | null>(null);

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
            <PasswordField
              id="u-password"
              label="Password"
              value={form.password}
              onChange={(value) => setForm({ ...form, password: value })}
              required
            />
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
              <div>
                <Label htmlFor="u-timezone">Timezone</Label>
                <Select id="u-timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                  {timezoneOptions(form.timezone).map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {form.role === 'Recruit' ? (
              <div data-tour="provision-template">
                <Label htmlFor="u-template">Checklist template (optional)</Label>
                <Select id="u-template" value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}>
                  <option value="">None</option>
                  {templates?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.items.length} tasks)
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Seeds the recruit's Task Log with due dates based on their start date.
                </p>
              </div>
            ) : null}
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
                    <p className="text-sm text-muted-foreground">
                      {u.email} · {formatTimezone(u.timezone)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="primary">{u.role}</Badge>
                    <Button variant="ghost" size="icon" aria-label={`Edit ${u.name}`} onClick={() => setEditing(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${u.name}`} onClick={() => setConfirmDelete(u)}>
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

      {editing ? (
        <EditUserModal
          user={editing}
          managers={managers.filter((m) => m.id !== editing.id)}
          departments={departments ?? []}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete user?"
        message={
          confirmDelete
            ? `${confirmDelete.name} and their entries will be permanently removed.`
            : ''
        }
        pending={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function EditUserModal({
  user,
  managers,
  departments,
  onClose,
}: {
  user: User;
  managers: User[];
  departments: Department[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    name: user.name,
    role: user.role as string,
    departmentId: user.departmentId ?? '',
    managerId: user.managerId ?? '',
    timezone: user.timezone,
    startDate: user.startDate.slice(0, 10),
    password: '',
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api(`/users/${user.id}`, {
        method: 'PUT',
        body: {
          name: form.name,
          role: form.role,
          startDate: form.startDate,
          timezone: form.timezone,
          departmentId: form.departmentId || null,
          managerId: form.managerId || null,
          ...(form.password ? { password: form.password } : {}),
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      void qc.invalidateQueries({ queryKey: ['team'] });
      toast.success('User updated');
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Modal open title={`Edit ${user.name}`} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          updateMutation.mutate();
        }}
      >
        <div>
          <Label htmlFor="e-name">Name</Label>
          <Input id="e-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <Label htmlFor="e-email">Email</Label>
          <Input id="e-email" value={user.email} disabled />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="e-role">Role</Label>
            <Select id="e-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="e-start">Start date</Label>
            <Input id="e-start" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
          </div>
          <div>
            <Label htmlFor="e-dept">Department</Label>
            <Select id="e-dept" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">None</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="e-manager">Manager</Label>
            <Select id="e-manager" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
              <option value="">None</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="e-timezone">Timezone</Label>
            <Select id="e-timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
              {timezoneOptions(form.timezone).map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <PasswordField
          id="e-password"
          label="New password (optional)"
          value={form.password}
          onChange={(value) => setForm({ ...form, password: value })}
          placeholder="Leave blank to keep current"
          hint="Leave blank to keep current. Minimum 8 characters."
        />
        {updateMutation.isError ? (
          <p className="text-sm text-danger" role="alert">
            {(updateMutation.error as Error).message}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DepartmentsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const departmentsQuery = useDepartments();
  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Department | null>(null);

  const createMutation = useMutation({
    mutationFn: () => api('/departments', { method: 'POST', body: { name } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['departments'] });
      setName('');
      toast.success('Department added');
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<void>(`/departments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['departments'] });
      setConfirmDelete(null);
      toast.success('Department deleted');
    },
    onError: (e) => {
      setConfirmDelete(null);
      toast.error((e as Error).message);
    },
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
                  <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setConfirmDelete(d)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No departments" />
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete department?"
        message={
          confirmDelete
            ? `"${confirmDelete.name}" will be removed. Members are not deleted but lose this department.`
            : ''
        }
        pending={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function CategoriesTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const categoriesQuery = useCategories();
  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<TaskCategory | null>(null);

  const createMutation = useMutation({
    mutationFn: () => api('/categories', { method: 'POST', body: { name } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] });
      setName('');
      toast.success('Category added');
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<{ softDisabled: boolean }>(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['categories'] });
      setConfirmDelete(null);
      toast.success(result.softDisabled ? 'Category archived (still in use)' : 'Category deleted');
    },
    onError: (e) => {
      setConfirmDelete(null);
      toast.error((e as Error).message);
    },
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
                  <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setConfirmDelete(c)}>
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

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete category?"
        message={
          confirmDelete
            ? `"${confirmDelete.name}" will be deleted, or archived if tasks still use it.`
            : ''
        }
        pending={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

interface ItemForm {
  title: string;
  description: string;
  priority: string;
  dueOffsetDays: number;
  categoryId: string;
}

function TemplatesTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const templatesQuery = useTemplates();
  const [editing, setEditing] = useState<ChecklistTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ChecklistTemplate | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api<void>(`/templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['templates'] });
      setConfirmDelete(null);
      toast.success('Template deleted');
    },
    onError: (e) => {
      setConfirmDelete(null);
      toast.error((e as Error).message);
    },
  });

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)} data-tour="new-template">
          <Plus className="h-4 w-4" /> New template
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Checklist templates</CardTitle>
        </CardHeader>
        <CardContent>
          {templatesQuery.isLoading ? (
            <LoadingState />
          ) : templatesQuery.isError ? (
            <ErrorState message={(templatesQuery.error as Error).message} />
          ) : templatesQuery.data && templatesQuery.data.length > 0 ? (
            <ul className="divide-y divide-border">
              {templatesQuery.data.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.items.length} items
                      {t.role ? ` · ${t.role}` : ''}
                      {t.department ? ` · ${t.department.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${t.name}`} onClick={() => setConfirmDelete(t)}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No templates" hint="Create a reusable onboarding checklist." />
          )}
        </CardContent>
      </Card>

      {creating ? <TemplateEditor onClose={() => setCreating(false)} /> : null}
      {editing ? <TemplateEditor template={editing} onClose={() => setEditing(null)} /> : null}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete template?"
        message={
          confirmDelete
            ? `"${confirmDelete.name}" will be removed. Existing seeded tasks are not affected.`
            : ''
        }
        pending={deleteMutation.isPending}
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function TemplateEditor({
  template,
  onClose,
}: {
  template?: ChecklistTemplate;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: departments } = useDepartments();
  const { data: categories } = useCategories();
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [role, setRole] = useState(template?.role ?? '');
  const [departmentId, setDepartmentId] = useState(template?.departmentId ?? '');
  const [items, setItems] = useState<ItemForm[]>(
    template?.items.map((i) => ({
      title: i.title,
      description: i.description,
      priority: i.priority,
      dueOffsetDays: i.dueOffsetDays,
      categoryId: i.categoryId ?? '',
    })) ?? [],
  );

  const activeCategories: TaskCategory[] = categories?.filter((c) => c.isActive) ?? [];

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        name,
        description,
        role: role || null,
        departmentId: departmentId || null,
        items: items.map((i) => ({
          title: i.title,
          description: i.description,
          priority: i.priority,
          dueOffsetDays: Number(i.dueOffsetDays) || 0,
          categoryId: i.categoryId || null,
        })),
      };
      return template
        ? api(`/templates/${template.id}`, { method: 'PUT', body })
        : api('/templates', { method: 'POST', body });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['templates'] });
      toast.success(template ? 'Template updated' : 'Template created');
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function updateItem(index: number, patch: Partial<ItemForm>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  return (
    <Modal open title={template ? `Edit ${template.name}` : 'New template'} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
      >
        <div>
          <Label htmlFor="t-name">Name</Label>
          <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="t-desc">Description</Label>
          <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="t-role">Target role</Label>
            <Select id="t-role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">Any</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="t-dept">Department</Label>
            <Select id="t-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">Any</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Checklist items</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setItems((prev) => [
                  ...prev,
                  { title: '', description: '', priority: 'Medium', dueOffsetDays: 0, categoryId: '' },
                ])
              }
            >
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </div>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items yet.</p>
          ) : (
            items.map((item, index) => (
              <div key={index} className="space-y-2 rounded-md border border-border p-3">
                <div className="flex gap-2">
                  <Input
                    aria-label={`Item ${index + 1} title`}
                    placeholder="Title"
                    value={item.title}
                    onChange={(e) => updateItem(index, { title: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove item ${index + 1}`}
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Select
                    aria-label={`Item ${index + 1} priority`}
                    value={item.priority}
                    onChange={(e) => updateItem(index, { priority: e.target.value })}
                  >
                    {TASK_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    aria-label={`Item ${index + 1} due offset days`}
                    placeholder="Due +days"
                    value={item.dueOffsetDays}
                    onChange={(e) => updateItem(index, { dueOffsetDays: Number(e.target.value) })}
                  />
                  <Select
                    aria-label={`Item ${index + 1} category`}
                    value={item.categoryId}
                    onChange={(e) => updateItem(index, { categoryId: e.target.value })}
                  >
                    <option value="">Default category</option>
                    {activeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            ))
          )}
        </div>

        {saveMutation.isError ? (
          <p className="text-sm text-danger" role="alert">
            {(saveMutation.error as Error).message}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save template'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
