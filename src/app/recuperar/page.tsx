import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/footer";
import { LocaleSwitcher } from "@/components/language/locale-switcher";
import { requestPasswordReset } from "./actions";

export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  const t = await getTranslations("auth.recover");

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
            {sent ? (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {t("sent")}
              </p>
            ) : (
              <form action={requestPasswordReset} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="tucorreo@ejemplo.com"
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
                <Button type="submit" className="mt-2 w-full">
                  {t("submit")}
                </Button>
              </form>
            )}
            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-medium text-primary hover:underline">
                {t("back")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
