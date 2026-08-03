import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  declare props: React.PropsWithChildren;
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('Unhandled error in app:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-bg">
          <div className="max-w-sm text-center p-8 bg-surface rounded-2xl shadow-sm">
            <h1 className="text-lg font-bold text-ink mb-2">Something went wrong</h1>
            <p className="text-sm text-ink-secondary mb-6">
              The app hit an unexpected error. Your data is safe on the server - reloading will bring you back to the latest version.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
