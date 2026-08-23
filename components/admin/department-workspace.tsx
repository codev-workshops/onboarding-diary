'use client';

import { useState } from 'react';

import { useAdminSubmit } from '@/components/admin/submit';
import { DialogField, EntryDialog, dialogId, textareaClass } from '@/components/entries/form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { DepartmentView } from '@/src/modules/departments/admin-service';

export function AdminDepartmentWorkspace({ departments }: { departments: DepartmentView[] }) {
  const [editing, setEditing] = useState<DepartmentView | 'new' | null>(null);
  const { saving, message, send } = useAdminSubmit();

  function setActive(department: DepartmentView, isActive: boolean) {
    void send({
      method: 'PATCH',
      path: `/api/v1/departments/${department.id}`,
      body: { is_active: isActive },
    });
  }

  function remove(department: DepartmentView) {
    if (!window.confirm(`Delete “${department.name}”?`)) return;
    void send({ method: 'DELETE', path: `/api/v1/departments/${department.id}` });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Departments</h1>
          <p className="text-muted-foreground text-sm">
            Deactivating a department keeps its members and stops new assignments.
          </p>
        </div>
        <Button onClick={() => setEditing('new')}>New department</Button>
      </div>

      {message ? (
        <p role="alert" className="text-destructive text-sm">
          {message}
        </p>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Department</TableHead>
            <TableHead className="text-right">Members</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.map((department) => (
            <TableRow key={department.id}>
              <TableCell>
                <span className="font-medium">{department.name}</span>
                {department.description ? (
                  <p className="text-muted-foreground text-xs">{department.description}</p>
                ) : null}
                {department.is_active ? null : (
                  <Badge variant="ghost" className="mt-1">
                    Inactive
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">{department.member_count}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <Button variant="ghost" size="sm" onClick={() => setEditing(department)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => setActive(department, !department.is_active)}
                >
                  {department.is_active ? 'Deactivate' : 'Reactivate'}
                </Button>
                {/* Only ever offered for an empty department; the server refuses
                    the rest with 409 DEPARTMENT_IN_USE regardless (US-73). */}
                {department.member_count === 0 ? (
                  <Button variant="ghost" size="sm" disabled={saving} onClick={() => remove(department)}>
                    Delete
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {editing ? (
        <DepartmentDialog
          department={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </section>
  );
}

function DepartmentDialog({ department, onClose }: { department?: DepartmentView; onClose: () => void }) {
  const { saving, message, fieldErrors, send } = useAdminSubmit(onClose);

  function submit(form: FormData) {
    const body = {
      name: String(form.get('name') ?? ''),
      description: String(form.get('description') ?? '').trim() || null,
    };

    void send(
      department
        ? { method: 'PATCH', path: `/api/v1/departments/${department.id}`, body }
        : { method: 'POST', path: '/api/v1/departments', body }
    );
  }

  return (
    <EntryDialog
      title={department ? 'Edit department' : 'New department'}
      saveLabel="Save department"
      saving={saving}
      message={message}
      onClose={onClose}
      onSubmit={submit}
    >
      <DialogField name="name" label="Name" errors={fieldErrors}>
        <Input
          id={dialogId('name')}
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={department?.name}
        />
      </DialogField>

      <DialogField name="description" label="Description" errors={fieldErrors}>
        <textarea
          id={dialogId('description')}
          name="description"
          rows={3}
          maxLength={255}
          defaultValue={department?.description ?? ''}
          className={textareaClass}
        />
      </DialogField>
    </EntryDialog>
  );
}
