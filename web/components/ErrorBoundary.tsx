'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React Component Tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto my-12 p-6 rounded-2xl bg-slate-900 border border-red-800/60 shadow-2xl text-center space-y-4">
          <AlertOctagon className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold font-serif text-slate-100">Something Went Wrong</h2>
          <p className="text-slate-400 text-xs font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 text-left overflow-x-auto">
            {this.state.error?.message || 'Unexpected application error'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
