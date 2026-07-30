window.__APP_CONFIG__ = window.__APP_CONFIG__ || {};

if (
  typeof window !== "undefined" &&
  !window.__APP_CONFIG__.apiOrigin &&
  !["localhost", "127.0.0.1"].includes(window.location.hostname)
) {
  window.__APP_CONFIG__.apiOrigin =
    "https://revize-backend-382571869063.europe-west1.run.app";
}

window.__APP_CONFIG__.routerMode = window.__APP_CONFIG__.routerMode || "hash";
