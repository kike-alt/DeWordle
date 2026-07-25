"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function redactSensitive(raw: string): string {
  return raw
    .replace(/[A-Za-z0-9]{20,}/g, "****")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "****@****.***");
}

export class WalletErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("WalletErrorBoundary caught:", redactSensitive(error.message), info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center gap-4 rounded-xl border border-red-800/40 bg-red-950/20 p-6 text-center"
        >
          <span className="text-3xl">⚠</span>
          <h2 className="text-lg font-semibold text-red-300">
            {this.props.fallbackLabel || "Something went wrong"}
          </h2>
          <p className="max-w-md text-sm text-red-200">
            {redactSensitive(
              this.state.error?.message || "An unexpected error occurred in the wallet provider."
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="rounded-lg border border-red-700/50 px-4 py-2 text-sm font-medium text-red-200 hover:bg-red-900/40"
            >
              Retry
            </button>
            <button
              onClick={this.handleReset}
              className="rounded-lg bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Reset
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
