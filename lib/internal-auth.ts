import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/* Two-layer gate for /internal/analytics:
   1. Runtime — the route only functions under `next dev` locally. In any built
      deployment (`next start` on Vercel), NODE_ENV is "production" and the page
      returns a 404, so the dashboard is unreachable in production entirely.
   2. Passkey — an env-secret unlock form sets a 48-hour cookie as a second
      layer, so a stray `next dev` on a shared machine still can't be read. */

export const UNLOCK_COOKIE = "internal_analytics_unlock";
const UNLOCK_MAX_AGE_SECONDS = 48 * 60 * 60;

/** True only when running the local dev server. The dashboard is inert (404)
 *  everywhere else. */
export function isDevRuntime(): boolean {
  return process.env.NODE_ENV === "development";
}

/** Constant-time string comparison that tolerates length mismatches. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** The opaque cookie value we store on a successful unlock: a hash of the
 *  secret, so the raw passkey never lives in the cookie. Null when unconfigured. */
function unlockToken(): string | null {
  const secret = process.env.INTERNAL_ANALYTICS_PASSKEY;
  if (!secret) return null;
  return createHash("sha256").update(secret).digest("hex");
}

/** Whether the passkey gate is configured at all. */
export function isPasskeyConfigured(): boolean {
  return Boolean(process.env.INTERNAL_ANALYTICS_PASSKEY);
}

/** Validate a submitted passkey against the env secret. */
export function checkPasskey(input: string): boolean {
  const secret = process.env.INTERNAL_ANALYTICS_PASSKEY;
  if (!secret) return false;
  return safeEqual(input, secret);
}

/** True when the current request carries a valid, unexpired unlock cookie. */
export async function hasValidUnlock(): Promise<boolean> {
  const token = unlockToken();
  if (!token) return false;
  const store = await cookies();
  const cookie = store.get(UNLOCK_COOKIE)?.value;
  return Boolean(cookie) && safeEqual(cookie!, token);
}

/** Set the 48-hour unlock cookie. Scoped to the dashboard path. */
export async function setUnlockCookie(): Promise<void> {
  const token = unlockToken();
  if (!token) return;
  const store = await cookies();
  store.set(UNLOCK_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Dev runs over http://localhost, so `secure` would drop the cookie.
    secure: false,
    path: "/internal/analytics",
    maxAge: UNLOCK_MAX_AGE_SECONDS,
  });
}
