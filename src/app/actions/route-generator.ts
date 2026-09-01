"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { findRegion, isKnownRegion, localitiesInRegion } from "@/lib/locality-regions";

const DIACRITICS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS_PATTERN, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

type RawClient = {
  id: string;
  company_name: string;
  address: string | null;
  visits: { status: string; scheduled_at: string }[];
};

export type RouteCandidate = {
  clientId: string;
  companyName: string;
  address: string | null;
  daysSinceLastVisit: number | null;
};

function computeCandidates(
  clients: RawClient[],
  matchesArea: (normalizedAddress: string) => boolean,
  cutoffMs: number,
  now: number
): RouteCandidate[] {
  const candidates: RouteCandidate[] = [];

  for (const client of clients) {
    const normalizedAddress = normalize(client.address ?? "");
    if (!normalizedAddress || !matchesArea(normalizedAddress)) continue;
    if (client.visits.some((v) => v.status === "pendiente")) continue;

    const completed = client.visits
      .filter((v) => v.status === "completada")
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());
    const lastVisitAt = completed[0]?.scheduled_at ?? null;

    if (lastVisitAt && new Date(lastVisitAt).getTime() > cutoffMs) continue;

    candidates.push({
      clientId: client.id,
      companyName: client.company_name,
      address: client.address,
      daysSinceLastVisit: lastVisitAt
        ? Math.floor((now - new Date(lastVisitAt).getTime()) / 86400000)
        : null,
    });
  }

  // Nunca visitado cuenta como el caso más prioritario (va primero); el
  // resto, de más días sin visitar a menos.
  candidates.sort((a, b) => {
    if (a.daysSinceLastVisit === null) return -1;
    if (b.daysSinceLastVisit === null) return 1;
    return b.daysSinceLastVisit - a.daysSinceLastVisit;
  });

  return candidates;
}

export async function generateRoute(input: { area: string; teamId: string | null }) {
  const t = await getTranslations("calendar.routeGenerator.errors");
  const area = input.area.trim();
  if (!area) {
    return { error: t("areaRequired") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const tErrors = await getTranslations("errors");
    return { error: tErrors("notAuthenticated") };
  }

  const [{ data: preference }, { data }] = await Promise.all([
    supabase
      .from("user_notification_preferences")
      .select("revisit_cycle_months")
      .eq("user_id", user.id)
      .maybeSingle(),
    input.teamId
      ? supabase
          .from("clients")
          .select("id, company_name, address, visits(status, scheduled_at), client_teams!inner(team_id)")
          .eq("client_teams.team_id", input.teamId)
      : supabase
          .from("clients")
          .select("id, company_name, address, visits(status, scheduled_at)")
          .eq("user_id", user.id),
  ]);

  if (!data) {
    return { error: t("searchFailed") };
  }

  const clients = data as unknown as RawClient[];
  const cycleMonths = preference?.revisit_cycle_months ?? 3;
  const now = Date.now();
  const cutoffMs = new Date(now);
  cutoffMs.setMonth(cutoffMs.getMonth() - cycleMonths);

  const normalizedArea = normalize(area);
  let candidates = computeCandidates(
    clients,
    (addr) => addr.includes(normalizedArea),
    cutoffMs.getTime(),
    now
  );

  let expandedTo: string | null = null;
  if (candidates.length === 0) {
    const region = findRegion(area) ?? isKnownRegion(area);
    if (region) {
      const localities = localitiesInRegion(region).map(normalize);
      const widened = computeCandidates(
        clients,
        (addr) => localities.some((loc) => addr.includes(loc)),
        cutoffMs.getTime(),
        now
      );
      if (widened.length > 0) {
        candidates = widened;
        expandedTo = region;
      }
    }
  }

  return {
    success: true as const,
    candidates: candidates.slice(0, 10),
    totalFound: candidates.length,
    expandedTo,
  };
}

export async function confirmRoute(input: {
  date: string;
  stops: { clientId: string; time: string }[];
}) {
  const t = await getTranslations("calendar.routeGenerator.errors");
  if (!input.date) {
    return { error: t("dateRequired") };
  }
  if (input.stops.length === 0) {
    return { error: t("noCandidates") };
  }

  const supabase = await createClient();
  const rows = input.stops.map((stop) => ({
    client_id: stop.clientId,
    scheduled_at: new Date(`${input.date}T${stop.time}`).toISOString(),
  }));

  const { error } = await supabase.from("visits").insert(rows);
  if (error) {
    return { error: t("confirmFailed") };
  }

  revalidatePath("/calendario");
  revalidatePath("/");
  return { success: true as const, count: rows.length };
}
