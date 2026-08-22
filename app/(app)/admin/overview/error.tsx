'use client';

import { Button } from '@/components/ui/button';

/** Nothing from the error is rendered; the digest correlates with the log (S14). */
export default function OrgOverviewError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">The organisation view could not be loaded</p>
      <p className="text-muted-foreground mt-1 text-sm">
        Something went wrong on our side. Please try again.
      </p>
      <Button className="mt-4" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
