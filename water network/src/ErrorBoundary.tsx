import { Component, type ReactNode } from "react";

/** a crash inside one tab shows a small message with a retry button, instead of blanking the whole dashboard */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error("Tab crashed:", error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="card" role="alert" style={{ padding: 24, display: "grid", gap: 12, justifyItems: "start" }}>
        <h3>This section could not load</h3>
        <p>The rest of the dashboard is still working. Try again, or open another tab.</p>
        <button className="btn" onClick={() => this.setState({ failed: false })}>Try again</button>
      </section>
    );
  }
}
