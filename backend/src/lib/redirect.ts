// Redirect targets receive auth secrets (OAuth tokens, password-reset tokens),
// so they must match one of the application's configured origins exactly.
// An empty allow-list means nothing is allowed — never "allow everything".
export function isAllowedRedirect(allowedOrigins: string[], redirectUrl: string): boolean {
  let target: URL;
  try {
    target = new URL(redirectUrl);
  } catch {
    return false;
  }

  if (target.protocol !== "https:" && target.protocol !== "http:") return false;

  return allowedOrigins.some((o) => {
    try {
      return new URL(o).origin === target.origin;
    } catch {
      return false;
    }
  });
}
