"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "belrion-cookie-consent";

export function CookieConsent() {
  const t = useTranslations("cookieBanner");
  const [consent, setConsent] = useState<"accepted" | "rejected" | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "accepted" || stored === "rejected") {
      setConsent(stored);
    }
    setReady(true);
  }, []);

  function decide(value: "accepted" | "rejected") {
    window.localStorage.setItem(STORAGE_KEY, value);
    setConsent(value);
  }

  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <>
      {consent === "accepted" && gaId && <GoogleAnalytics gaId={gaId} />}
      {ready && consent === null && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card px-4 py-4 shadow-lg sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {t("message")}{" "}
              <Link href="/cookies" className="text-primary underline underline-offset-2">
                {t("learnMore")}
              </Link>
            </p>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="outline" onClick={() => decide("rejected")}>
                {t("reject")}
              </Button>
              <Button type="button" onClick={() => decide("accepted")}>
                {t("accept")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
