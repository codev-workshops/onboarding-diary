/**
 * Report download (T-171). `POST /reports` streams a file rather than JSON, so it goes through
 * the client's `download` method, which keeps the bearer token and silent refresh but returns
 * the blob plus the server's filename (FR-R2).
 */

import { reportFilename, type CreateReportBody } from '@onboarding-diary/shared';
import { useMutation } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { useApiClient } from '../../lib/ApiClientContext.js';
import { saveBlob } from './saveBlob.js';

export type ReportDownloadInput = CreateReportBody & { fallbackName: string };

export function useReportDownload(): UseMutationResult<string, unknown, ReportDownloadInput> {
  const client = useApiClient();

  return useMutation({
    mutationFn: async ({ fallbackName, ...body }: ReportDownloadInput) => {
      const fallback = reportFilename({
        fullName: fallbackName,
        from: body.from,
        to: body.to,
        format: body.format,
      });
      const file = await client.download('/reports', body, fallback);
      saveBlob(file.blob, file.filename);
      return file.filename;
    },
  });
}
