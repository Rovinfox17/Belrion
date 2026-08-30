import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/footer";
import { LocaleSwitcher } from "@/components/language/locale-switcher";
import { confirmAuthLink } from "./actions";

export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash, type, next } = await searchParams;
  const t = await getTranslations("auth.confirm");

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="absolute right-3 top-3">
        <LocaleSwitcher compact />
      </div>
      <main className="flex flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-sm border-none shadow-lg">
          <CardHeader className="items-center text-center">
            <Image
              src="/logo.png"
              alt="Belrion"
              width={64}
              height={64}
              className="mb-2 rounded-full"
              priority
            />
            <CardTitle className="font-heading text-2xl text-primary">Belrion</CardTitle>
            <CardDescription>{t("subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {token_hash && type ? (
              <form action={confirmAuthLink} className="flex flex-col gap-4">
                <input type="hidden" name="token_hash" value={token_hash} />
                <input type="hidden" name="type" value={type} />
                <input type="hidden" name="next" value={next ?? "/"} />
                <Button type="submit" className="w-full">
                  {t("confirm")}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-destructive" role="alert">
                {t("invalidLink")}
              </p>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
