import { type Request, type Response, type NextFunction } from "express";

/**
 * CSRF protection.
 *
 * Since the app uses sameSite: "lax" session cookies, external sites cannot
 * send state-changing requests with the user's credentials via form POST.
 * This middleware adds defense in depth by:
 *
 * 1. Checking for a custom header (x-requested-with) — reliably blocks
 *    cross-origin fetch/XMLHttpRequest since browsers enforce same-origin
 *    policy on custom headers.
 *
 * 2. Falling back to Origin/Referer validation — allows all same-origin
 *    requests, including raw fetch() calls from the frontend that bypass
 *    the customFetch client.
 */
const CSRF_HEADER = "x-requested-with";
const CSRF_HEADER_VALUE = "devlink-ke";

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Safe methods – no CSRF risk
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    next();
    return;
  }

  // 1. Custom header check — set by customFetch
  if (req.headers[CSRF_HEADER] === CSRF_HEADER_VALUE) {
    next();
    return;
  }

  // 2. Same-origin check — allows raw fetch() calls from the frontend
  const origin = req.headers["origin"];
  const referer = req.headers["referer"];
  const host = req.headers["host"];

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) {
        next();
        return;
      }
    } catch {
      // invalid origin URL — reject
    }
  } else if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost === host) {
        next();
        return;
      }
    } catch {
      // invalid referer URL — reject
    }
  }

  res.status(403).json({ error: "CSRF validation failed" });
}
