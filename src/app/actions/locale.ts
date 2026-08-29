"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, isSupportedLocale } from "@/i18n/locales";

export async function setLocale(locale: string) {
  if (!isSupportedLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
