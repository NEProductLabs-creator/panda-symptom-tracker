import { createRoot } from "react-dom/client";
import { initAnalytics, ANALYTICS_CONSENT_KEY } from "./lib/analytics";
import App from "./App";
import "./index.css";

if (localStorage.getItem(ANALYTICS_CONSENT_KEY) === '1') {
  initAnalytics();
}

createRoot(document.getElementById("root")!).render(<App />);
