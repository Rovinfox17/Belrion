import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FeedbackForm } from "@/components/feedback/feedback-form";

export default async function FeedbackPage() {
  const t = await getTranslations("feedback");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t("formTitle")}</CardTitle>
          <CardDescription>{t("formDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <FeedbackForm />
        </CardContent>
      </Card>
    </div>
  );
}
