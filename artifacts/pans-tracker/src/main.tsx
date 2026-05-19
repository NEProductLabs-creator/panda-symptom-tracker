import { createRoot } from "react-dom/client";
import { initAnalytics } from "./lib/analytics";
import App from "./App";
import "./index.css";

initAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
