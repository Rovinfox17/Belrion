export const SUPPORTED_LOCALES = ["es", "ca", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "es";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isSupportedLocale(value: string | undefined): value is SupportedLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export const LOCALE_OPTIONS = [
  { code: "es" as const, label: "Español" },
  { code: "ca" as const, label: "Català" },
  { code: "en" as const, label: "English" },
];
