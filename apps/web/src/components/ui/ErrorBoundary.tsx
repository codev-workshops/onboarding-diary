import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
            <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
            <p className="mt-2 text-sm text-gray-500">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
