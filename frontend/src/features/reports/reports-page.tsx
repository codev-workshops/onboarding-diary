import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Card, CardContent, MenuItem, Stack, TextField } from '@mui/material';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiClient, getErrorMessage } from '../../shared/api/api-client';
import { PageHeader } from '../../shared/ui/page-header';
import { useRecruitContext } from '../recruits/recruit-context';

const reportSchema = z
  .object({
    type: z.enum(['tasks', 'issues', 'feedback', 'combined']),
    format: z.enum(['pdf', 'csv']),
    from: z.string().min(1, 'From date is required'),
    to: z.string().min(1, 'To date is required'),
  })
  .refine((values) => values.from <= values.to, { path: ['to'], message: 'To date must be on or after the from date' });

type ReportFormValues = z.infer<typeof reportSchema>;

function isoMonthsAgo(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
}

export function ReportsPage() {
  const { recruitId } = useRecruitContext();
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      type: 'combined',
      format: 'pdf',
      from: isoMonthsAgo(1),
      to: new Date().toISOString().slice(0, 10),
    },
  });

  const onSubmit = async (values: ReportFormValues) => {
    setError(null);
    setDownloading(true);
    try {
      const response = await apiClient.get('/api/reports', {
        params: { ...values, recruitId: recruitId ?? undefined },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `onboarding-${values.type}-${values.from}-to-${values.to}.${values.format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(getErrorMessage(downloadError));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="Export onboarding activity as PDF or CSV." />
      <Card variant="outlined">
        <CardContent>
          <Stack component="form" spacing={2} onSubmit={handleSubmit(onSubmit)}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <TextField select label="Report type" sx={{ minWidth: 200 }} {...field}>
                    <MenuItem value="tasks">Tasks</MenuItem>
                    <MenuItem value="issues">Issues</MenuItem>
                    <MenuItem value="feedback">Feedback</MenuItem>
                    <MenuItem value="combined">Combined</MenuItem>
                  </TextField>
                )}
              />
              <Controller
                control={control}
                name="format"
                render={({ field }) => (
                  <TextField select label="Format" sx={{ minWidth: 160 }} {...field}>
                    <MenuItem value="pdf">PDF</MenuItem>
                    <MenuItem value="csv">CSV</MenuItem>
                  </TextField>
                )}
              />
              <TextField
                label="From"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                {...register('from')}
                error={Boolean(errors.from)}
                helperText={errors.from?.message}
              />
              <TextField
                label="To"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
                {...register('to')}
                error={Boolean(errors.to)}
                helperText={errors.to?.message}
              />
            </Stack>
            <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
              <Button type="submit" variant="contained" disabled={downloading}>
                Generate report
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}
