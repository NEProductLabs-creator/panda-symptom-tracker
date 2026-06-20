import { createRoot } from "react-dom/client";
import { Component, type ReactNode, type ErrorInfo } from "react";
import "./index.css";

// Safety net: catches render-time errors that React 18 would otherwise
// silently unmount (no visible output). Only shows if something truly
// unexpected happens — normal app errors have their own UI.
class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Root render error:", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      const e = this.state.error;
      return (
        <div style={{ fontFamily: "monospace", padding: 32, color: "#b00", background: "#fff", minHeight: "100vh" }}>
          <b style={{ fontSize: 18 }}>Something went wrong</b>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, maxWidth: 800, marginTop: 16 }}>
            {e.name}: {e.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

async function main() {
  const analyticsModule = await import("./lib/analytics");
  if (localStorage.getItem(analyticsModule.ANALYTICS_CONSENT_KEY) === "1") {
    analyticsModule.initAnalytics();
  }

  const { default: App } = await import("./App");
  createRoot(document.getElementById("root")!).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>,
  );
}

main().catch((err) => {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<div style="font-family:monospace;padding:32px;color:#b00;background:#fff;min-height:100vh">
      <b style="font-size:18px">App failed to load</b><br><br>
      <pre style="white-space:pre-wrap;font-size:13px">${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}</pre>
    </div>`;
  }
});
