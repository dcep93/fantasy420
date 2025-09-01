import React from "react";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error }
> {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ error });
  }

  render() {
    if (this.state?.error) {
      return <pre>{this.state.error.stack}</pre>;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
