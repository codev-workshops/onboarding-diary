/**
 * Route-level error boundary (T-190). A render failure inside a page must not blank the whole
 * app, so the shell keeps rendering and only the outlet is replaced. `resetKey` changes on
 * navigation, which clears the captured error — otherwise the fallback would stick to the next
 * route as well (TRD 6.4).
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { Button } from '../components/ui/Button.js';
import { ApiError } from '../lib/apiClient.js';

type Props = {
  children: ReactNode;
  resetKey?: string;
};

type State = {
  error: unknown;
};

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  override componentDidUpdate(previous: Props): void {
    if (previous.resetKey !== this.props.resetKey && this.state.error !== null) {
      this.setState({ error: null });
    }
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Unhandled render error', error, info.componentStack);
  }

  private readonly retry = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;

    const requestId = error instanceof ApiError ? error.requestId : null;

    return (
      <div className="mx-auto max-w-lg py-16 text-center" role="alert">
        <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-slate-600">
          This page could not be displayed. Trying again usually helps; if it does not, quote the
          reference below.
        </p>
        {requestId === null ? null : (
          <p className="mt-2 text-xs text-slate-500">Reference: {requestId}</p>
        )}
        <Button className="mt-6" onClick={this.retry}>
          Try again
        </Button>
      </div>
    );
  }
}
