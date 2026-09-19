import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Global React Error Boundary.
 * Catches any uncaught render-time exceptions and shows a recovery UI
 * instead of a blank screen. Particularly useful for lazy-loaded pages
 * that crash due to null/undefined data access.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-command-text dark:text-white mb-1">
                Something went wrong
              </h2>
              <p className="text-sm text-command-muted dark:text-slate-400">
                An unexpected error occurred while rendering this page. Your data is safe.
              </p>
              {this.state.error && (
                <pre className="mt-3 text-xs text-left bg-slate-100 dark:bg-navy-900 text-red-500 dark:text-red-400 p-3 rounded-xl overflow-auto border border-command-border dark:border-navy-border max-h-32">
                  {this.state.error.message}
                </pre>
              )}
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-tomato-500 hover:bg-tomato-600 text-white text-sm font-bold transition-all shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <a
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-navy-900 border border-command-border dark:border-navy-border text-command-text dark:text-white text-sm font-bold transition-all shadow-sm hover:bg-slate-50 dark:hover:bg-navy-800"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
