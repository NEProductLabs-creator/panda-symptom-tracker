import { createRoot } from "react-dom/client";
import "./index.css";

function showError(msg: string) {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<div style="font-family:monospace;padding:32px;color:#b00;background:#fff;min-height:100vh">
      <b style="font-size:18px">App failed to start</b><br><br>
      <pre style="white-space:pre-wrap;font-size:13px;max-width:800px">${msg}</pre>
    </div>`;
  }
}

async function main() {
  try {
    const [{ initAnalytics }, { ANALYTICS_CONSENT_KEY }] = await Promise.all([
      import("./lib/analytics"),
      import("./lib/analytics"),
    ]);

    if (localStorage.getItem(ANALYTICS_CONSENT_KEY) === "1") {
      initAnalytics();
    }

    const { default: App } = await import("./App");
    createRoot(document.getElementById("root")!).render(<App />);
  } catch (err) {
    showError(err instanceof Error ? `${err.name}: ${err.message}\n\n${err.stack ?? ""}` : String(err));
  }
}

main().catch((err) => showError(String(err)));
