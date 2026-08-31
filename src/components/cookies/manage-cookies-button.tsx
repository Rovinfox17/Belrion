"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "belrion-cookie-consent";

export function ManageCookiesButton() {
  const t = useTranslations("legal");

  return (
    <Button
      type="button"
      variant="outline"
      className="mb-6"
      onClick={() => {
        window.localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
      }}
    >
      {t("manageCookies")}
    </Button>
  );
}
