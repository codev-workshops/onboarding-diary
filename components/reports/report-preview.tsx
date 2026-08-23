import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ReportModel } from '@/src/modules/reports/model';

const MAX_PREVIEW_ROWS = 200;

/**
 * The on-screen report. It renders the model the API returned and nothing else
 * — no second query, no client-side filtering — so what is previewed is what
 * the CSV (and, from M9, the PDF) contains, down to the row order.
 */
export function ReportPreview({
  report,
  viewer,
}: {
  report: ReportModel;
  viewer: { id: string; full_name: string };
}) {
  const totals = report.summary?.totals;

  return (
    <div className="space-y-6" data-testid="report-preview">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {report.scope.description} · {report.period.date_from} to {report.period.date_to}
          </CardTitle>
          <CardDescription>
            Generated {new Date(report.generated_at).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC by{' '}
            {viewer.full_name} ({report.generated_by.role.toLowerCase()}) · {report.scope.subjects.length}{' '}
            {report.scope.subjects.length === 1 ? 'person' : 'people'}
          </CardDescription>
        </CardHeader>

        {report.summary ? (
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                  <TableHead className="text-right">Done</TableHead>
                  <TableHead className="text-right">Completion</TableHead>
                  <TableHead className="text-right">Issues</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">Feedback</TableHead>
                  <TableHead className="text-right">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.summary.per_user.map((row) => (
                  <TableRow key={row.user_id}>
                    <TableCell className="font-medium">{row.full_name}</TableCell>
                    <TableCell className="text-right">{row.tasks_total}</TableCell>
                    <TableCell className="text-right">{row.tasks_done}</TableCell>
                    <TableCell className="text-right">{row.tasks_completion_pct}%</TableCell>
                    <TableCell className="text-right">{row.issues_total}</TableCell>
                    <TableCell className="text-right">{row.issues_open}</TableCell>
                    <TableCell className="text-right">{row.feedback_total}</TableCell>
                    <TableCell className="text-right">{row.notes_total}</TableCell>
                  </TableRow>
                ))}
                {totals ? (
                  <TableRow>
                    <TableCell className="font-semibold">All {totals.users}</TableCell>
                    <TableCell className="text-right font-semibold">{totals.tasks_total}</TableCell>
                    <TableCell className="text-right font-semibold">{totals.tasks_done}</TableCell>
                    <TableCell className="text-right font-semibold">{totals.tasks_completion_pct}%</TableCell>
                    <TableCell className="text-right font-semibold">{totals.issues_total}</TableCell>
                    <TableCell className="text-right font-semibold">{totals.issues_open}</TableCell>
                    <TableCell className="text-right font-semibold">{totals.feedback_total}</TableCell>
                    <TableCell className="text-right font-semibold">{totals.notes_total}</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        ) : null}
      </Card>

      {report.sections.map((section) => (
        <Card key={section.key}>
          <CardHeader>
            <CardTitle className="text-base">
              {section.label} · {section.row_count}
            </CardTitle>
            {section.row_count > MAX_PREVIEW_ROWS ? (
              <CardDescription>
                Showing the first {MAX_PREVIEW_ROWS} rows; the CSV contains all {section.row_count}.
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            {section.row_count === 0 ? (
              <p className="text-muted-foreground text-sm">
                No {section.label.toLowerCase()} in this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {section.columns
                        .filter((column) => column.key !== 'user_id')
                        .map((column) => (
                          <TableHead key={column.key}>{column.label}</TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.rows.slice(0, MAX_PREVIEW_ROWS).map((row, index) => (
                      <TableRow key={`${section.key}-${index}`}>
                        {section.columns
                          .filter((column) => column.key !== 'user_id')
                          .map((column) => (
                            <TableCell key={column.key} className="max-w-[24rem] truncate">
                              {row[column.key] ?? ''}
                            </TableCell>
                          ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="text-muted-foreground space-y-1 pt-6 text-xs">
          {report.withheld.feedback > 0 ? (
            <p data-testid="withheld-notice">
              {report.withheld.feedback} feedback{' '}
              {report.withheld.feedback === 1 ? 'entry is' : 'entries are'} marked admin-only and are not
              included.
            </p>
          ) : null}
          {Object.keys(report.filters_applied).length > 0 ? (
            <p>
              Filters:{' '}
              {Object.entries(report.filters_applied)
                .map(([key, value]) => `${key}: ${value}`)
                .join(' · ')}
            </p>
          ) : null}
          <p>{report.confidentiality}</p>
          <p>Report {report.report_id}</p>
        </CardContent>
      </Card>
    </div>
  );
}
