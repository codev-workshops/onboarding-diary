'use client';

import { Button } from '@/components/ui/button';

/**
 * The thrown error may carry a database message or a stack, so nothing from it
 * is rendered — the digest is enough to correlate with the server log (S14).
 */
export default function IssuesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">Your issues could not be loaded</p>
      <p className="text-muted-foreground mt-1 text-sm">
        Something went wrong on our side. Please try again.
      </p>
      <Button className="mt-4" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
