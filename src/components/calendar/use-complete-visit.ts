"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { setVisitStatus } from "@/app/actions/visits";
import { getCurrentPositionSafe } from "@/lib/geolocation-client";
import { formatDistance } from "@/lib/geo-distance";

// A partir de aquí el check-in se considera "lejos" del cliente — es solo
// informativo, nunca bloquea completar la visita.
const FAR_THRESHOLD_METERS = 500;

/** Completa una visita pidiendo la ubicación del dispositivo (API nativa,
 * sin bloquear si se deniega) y avisa con la distancia al cliente si se
 * puede calcular. Compartido entre el Calendario y la ficha de cliente,
 * los dos sitios donde hoy se puede marcar una visita como completada. */
export function useCompleteVisit() {
  const t = useTranslations("clients.visits");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function complete(id: string, clientId: string, onDone?: () => void) {
    startTransition(async () => {
      const checkin = await getCurrentPositionSafe();
      const result = await setVisitStatus({ id, clientId, status: "completada", checkin });

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (result.distanceMeters != null) {
        const distance = formatDistance(result.distanceMeters);
        toast.success(
          result.distanceMeters > FAR_THRESHOLD_METERS
            ? t("checkinFar", { distance })
            : t("checkinNear", { distance })
        );
      } else {
        toast.success(t("statusUpdated"));
      }

      onDone?.();
      router.refresh();
    });
  }

  return { complete, isPending };
}
