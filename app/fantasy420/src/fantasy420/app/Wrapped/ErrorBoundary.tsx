import React from "react";

type ErrorBoundaryProps = {
  /** Called to render UI when a child throws */
  onErrorUI: (error: Error) => React.ReactNode;
  children: React.ReactNode;
};

type ErrorBoundaryState = { error: Error | null };

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return this.props.onErrorUI(this.state.error);
    }
    return this.props.children;
  }
}
export default ErrorBoundary;
