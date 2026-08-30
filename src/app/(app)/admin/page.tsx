import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessRequestRow, type AccessRequestData } from "@/components/admin/access-request-row";

const CATEGORY_LABEL_KEY = {
  error: "categoryError",
  mejora: "categoryImprovement",
  otro: "categoryOther",
} as const;

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound();

  const t = await getTranslations("admin");
  const tFeedback = await getTranslations("feedback");

  const [{ data: pendingRequests }, { data: feedback }] = await Promise.all([
    supabase
      .from("access_requests")
      .select("id, name, email, reason, created_at")
      .eq("status", "pendiente")
      .order("created_at", { ascending: false }),
    supabase.rpc("get_feedback_submissions"),
  ]);

  const requests: AccessRequestData[] = (pendingRequests ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    reason: r.reason,
    createdAt: r.created_at,
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t("requests.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("requests.empty")}
            </p>
          ) : (
            <ul>
              {requests.map((request) => (
                <AccessRequestRow key={request.id} request={request} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t("feedback.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!feedback || feedback.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("feedback.empty")}</p>
          ) : (
            <ul>
              {feedback.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-col gap-1 border-b border-border py-3 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{f.email}</span>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                      {tFeedback(CATEGORY_LABEL_KEY[f.category])}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{f.message}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
