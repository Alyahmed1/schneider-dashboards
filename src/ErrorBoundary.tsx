import { Component, type ReactNode } from "react";

/** if one tab fails, say so and keep the rest of the dashboard working */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="loading" role="alert">
        <b>This part could not be shown.</b>
        <button className="primary" onClick={() => this.setState({ failed: false })}>Try again</button>
      </div>
    );
  }
}
