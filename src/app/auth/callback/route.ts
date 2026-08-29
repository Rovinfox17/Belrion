import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  const t = await getTranslations("auth.errors");
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(t("invalidOrExpiredLink"))}`
  );
}
