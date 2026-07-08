"use server";

import {
  checkPasskey,
  isDevRuntime,
  isPasskeyConfigured,
  setUnlockCookie,
} from "@/lib/internal-auth";

export type UnlockResult = { ok: true } | { ok: false; error: string };

/* Validates the submitted passkey against INTERNAL_ANALYTICS_PASSKEY and, on
   success, sets the 48-hour unlock cookie. Refuses outright outside local dev
   so the action can never unlock anything in a production runtime. */
export async function unlockAnalyticsAction(passkey: string): Promise<UnlockResult> {
  if (!isDevRuntime()) {
    return { ok: false, error: "Not available." };
  }
  if (!isPasskeyConfigured()) {
    return {
      ok: false,
      error: "INTERNAL_ANALYTICS_PASSKEY is not set in .env.local.",
    };
  }
  if (!checkPasskey(passkey)) {
    return { ok: false, error: "Incorrect passkey." };
  }
  await setUnlockCookie();
  return { ok: true };
}
