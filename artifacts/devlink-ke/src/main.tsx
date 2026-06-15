import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Inject CSRF header on all /api requests so raw fetch() calls pass the check
const _fetch = window.fetch;
window.fetch = (input, init = {}) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("/api") || url.includes("/api/")) {
    const headers = new Headers(init.headers);
    if (!headers.has("x-requested-with")) headers.set("x-requested-with", "devlink-ke");
    init = { ...init, headers };
  }
  return _fetch(input, init);
};

createRoot(document.getElementById("root")!).render(<App />);
