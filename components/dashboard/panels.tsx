import Link from 'next/link';

import { formatDate, labelize } from '@/components/entries/labels';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { RecentEntry } from '@/src/modules/dashboard/dto';
import type { IssueDto } from '@/src/modules/issues/dto';

const KIND_HREF: Record<RecentEntry['kind'], string> = {
  TASK: '/tasks',
  ISSUE: '/issues',
  FEEDBACK: '/feedback',
  NOTE: '/notes',
};

function EmptyPanel({ children }: { children: string }) {
  return <p className="text-muted-foreground py-6 text-center text-sm">{children}</p>;
}

export function OpenIssuesPanel({ issues, ownerNames }: { issues: IssueDto[]; ownerNames: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Open issues</CardTitle>
        <CardDescription>
          Everything still open or in progress, regardless of the period above.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <EmptyPanel>Nothing blocked right now.</EmptyPanel>
        ) : (
          <ul className="divide-y">
            {issues.map((issue) => (
              <li key={issue.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{issue.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(issue.entry_date)}
                    {ownerNames ? ` · ${issue.owner.full_name}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Badge variant={issue.severity === 'CRITICAL' ? 'destructive' : 'outline'}>
                    {labelize(issue.severity)}
                  </Badge>
                  <Badge variant="secondary">{labelize(issue.status)}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function RecentEntriesPanel({ entries, ownerNames }: { entries: RecentEntry[]; ownerNames: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
        <CardDescription>The last ten entries you are permitted to see.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyPanel>No entries yet.</EmptyPanel>
        ) : (
          <ul className="divide-y">
            {entries.map((entry) => (
              <li key={`${entry.kind}-${entry.id}`} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={KIND_HREF[entry.kind]}
                    prefetch={false}
                    className="truncate text-sm hover:underline"
                  >
                    {entry.title}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {formatDate(entry.entry_date)}
                    {ownerNames ? ` · ${entry.owner.full_name}` : ''}
                  </p>
                </div>
                <Badge variant="ghost">{labelize(entry.kind)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
