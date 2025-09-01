import React from "react";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error; info: React.ErrorInfo }
> {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ error, info });
  }

  render() {
    if (this.state?.error) {
      return (
        <div>
          <h2>Something went wrong</h2>
          <pre>{this.state.error.stack}</pre>
          <pre>{this.state.info.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
