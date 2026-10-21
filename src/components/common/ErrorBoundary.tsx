import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TraderZone ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 md:p-8 rounded-3xl bg-surface-card border border-border shadow-md my-6 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-black text-foreground tracking-tight">
              {this.props.fallbackTitle || 'Unable to display this view'}
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              An unexpected display issue occurred. You can reset this section or reload the application to restore view.
            </p>
          </div>

          {this.state.error && (
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border text-left font-mono text-[11px] text-muted overflow-x-auto max-h-24">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={this.handleReset}
            >
              Try Again
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              onClick={this.handleReload}
            >
              Reload App
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
