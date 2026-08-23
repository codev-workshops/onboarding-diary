import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AuditLogView } from '@/src/modules/audit/query-service';
import type { AuditLogQuery } from '@/src/modules/audit/schemas';
import type { Page } from '@/src/modules/entries/paging';

type Props = { page: Page<AuditLogView>; actions: string[]; query: AuditLogQuery };

const asDate = (value: Date | undefined) => (value ? value.toISOString().slice(0, 10) : '');

/**
 * A plain `GET` form and plain links: filtering and paging an audit log is a
 * navigation, so it survives a reload, a bookmark and a hand-edited query
 * string without any client state.
 */
export function AuditLogTable({ page, actions, query }: Props) {
  const pageHref = (next: number) => {
    const params = new URLSearchParams();
    if (query.action) params.set('action', query.action);
    if (query.entity_type) params.set('entity_type', query.entity_type);
    if (query.actor_user_id) params.set('actor_user_id', query.actor_user_id);
    if (query.target_user_id) params.set('target_user_id', query.target_user_id);
    if (query.date_from) params.set('date_from', asDate(query.date_from));
    if (query.date_to) params.set('date_to', asDate(query.date_to));
    params.set('page', String(next));
    return `/admin/audit?${params.toString()}`;
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-muted-foreground text-sm">
          Security-relevant events: sign-ins, account and department changes, cross-user writes, privileged
          reads and generated reports. Entry contents are never recorded.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3" aria-label="Filter audit events">
        <label className="text-sm">
          <span className="text-muted-foreground mb-1 block text-xs">Action</span>
          <select
            name="action"
            defaultValue={query.action ?? ''}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          >
            <option value="">All actions</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground mb-1 block text-xs">From</span>
          <Input type="date" name="date_from" defaultValue={asDate(query.date_from)} />
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground mb-1 block text-xs">To</span>
          <Input type="date" name="date_to" defaultValue={asDate(query.date_to)} />
        </label>
        <Button type="submit">Filter</Button>
        <Link href="/admin/audit" className={buttonVariants({ variant: 'ghost' })}>
          Clear
        </Link>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {page.items.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                {row.created_at.replace('T', ' ').slice(0, 19)}
              </TableCell>
              <TableCell>
                <Badge variant={row.action.startsWith('AUTHZ') ? 'destructive' : 'ghost'}>{row.action}</Badge>
              </TableCell>
              <TableCell className="text-sm">
                {row.actor ? `${row.actor.full_name} (${row.actor.role})` : 'Anonymous'}
              </TableCell>
              <TableCell className="text-sm">{row.target?.full_name ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground max-w-md truncate text-xs">{detail(row)}</TableCell>
            </TableRow>
          ))}
          {page.items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-sm">
                No audit events match these filters.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          {page.page.total} events · page {page.page.page} of {page.page.total_pages}
        </p>
        <div className="flex gap-2">
          {page.page.page > 1 ? (
            <Link href={pageHref(page.page.page - 1)} className={buttonVariants({ variant: 'ghost' })}>
              Previous
            </Link>
          ) : null}
          {page.page.page < page.page.total_pages ? (
            <Link href={pageHref(page.page.page + 1)} className={buttonVariants({ variant: 'ghost' })}>
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function detail(row: AuditLogView): string {
  const parts = [row.entity_type, row.after ?? row.before]
    .filter((part) => part !== null && part !== undefined)
    .map((part) => (typeof part === 'string' ? part : JSON.stringify(part)));

  return parts.join(' ') || '—';
}
