import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Footer } from "@/components/layout/footer";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function RestablecerPage() {
  const t = await getTranslations("auth.reset");

  return (
    <div className="flex min-h-screen flex-col bg-background">
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
            <ResetPasswordForm />
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
