"use server";

import { cookies } from "next/headers";

import { LANGUAGE_COOKIE, LANGUAGE_COOKIE_MAX_AGE_SECONDS, isLanguage } from "@/lib/i18n/config";

// Called by the IT | EN toggle. Setting a cookie in a server action makes Next
// re-render the current route in the same round trip, so the page switches
// language without navigating. The value is validated: anything but it/en is
// ignored.
export async function setLanguage(language: unknown): Promise<void> {
  if (!isLanguage(language)) return;

  (await cookies()).set(LANGUAGE_COOKIE, language, {
    path: "/",
    maxAge: LANGUAGE_COOKIE_MAX_AGE_SECONDS,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
}
