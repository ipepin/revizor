const TOKEN_KEY = "revize_jwt";
const EMAIL_KEY = "revize_email";

function getRouterMode(): string {
  return (
    (window as any)?.__APP_CONFIG__?.routerMode ||
    import.meta.env.VITE_ROUTER_MODE ||
    "browser"
  );
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

export function getLoginRedirectUrl(): string {
  const loginPath = getRouterMode() === "hash" ? "/#/login" : "/login";
  return `${window.location.origin}${loginPath}`;
}

export function redirectToLogin(): void {
  const target = getLoginRedirectUrl();
  if (window.location.href !== target) {
    window.location.replace(target);
  }
}

export function expireSession(options?: { redirect?: boolean }): void {
  clearStoredAuth();
  if (options?.redirect !== false) {
    redirectToLogin();
  }
}

export { EMAIL_KEY, TOKEN_KEY };
