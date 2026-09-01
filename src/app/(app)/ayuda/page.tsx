import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function Step({ title, text, example }: { title: string; text: string; example?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm leading-relaxed text-foreground/90">{text}</p>
      {example && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {example}
        </p>
      )}
    </div>
  );
}

export default async function AyudaPage() {
  const t = await getTranslations("help");
  const tc = await getTranslations("help.customFields");
  const tr = await getTranslations("help.routeGenerator");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("intro")}</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{tc("title")}</CardTitle>
          <CardDescription>{tc("intro")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Step title={tc("step1Title")} text={tc("step1Text")} example={tc("step1Example")} />
          <Step title={tc("step2Title")} text={tc("step2Text")} example={tc("step2Example")} />
          <Step title={tc("step3Title")} text={tc("step3Text")} example={tc("step3Example")} />
          <Step title={tc("step4Title")} text={tc("step4Text")} />
          <Step title={tc("step5Title")} text={tc("step5Text")} />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{tr("title")}</CardTitle>
          <CardDescription>{tr("intro")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Step title={tr("step1Title")} text={tr("step1Text")} example={tr("step1Example")} />
          <Step title={tr("step2Title")} text={tr("step2Text")} example={tr("step2Example")} />
          <Step title={tr("step3Title")} text={tr("step3Text")} example={tr("step3Example")} />
        </CardContent>
      </Card>
    </div>
  );
}
