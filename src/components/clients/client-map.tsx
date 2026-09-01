"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

export type MapClient = {
  id: string;
  companyName: string;
  status: "activo" | "potencial" | "inactivo";
  latitude: number;
  longitude: number;
  nextVisitAt: string | null;
};

// Colores calcados de los badges de estado del listado (client-list.tsx),
// en versión sólida para que se lean bien como chincheta sobre el mapa.
const STATUS_COLOR: Record<MapClient["status"], string> = {
  activo: "#10b981",
  potencial: "#f59e0b",
  inactivo: "#fb7185",
};

// Círculo de color por CSS en vez del icono por defecto de Leaflet: evita
// depender de sus imágenes marker-icon.png/marker-shadow.png, que dan
// problemas de ruta con el bundler de Next.js.
function statusIcon(status: MapClient["status"]) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${STATUS_COLOR[status]};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

export function ClientMap({ clients, locale }: { clients: MapClient[]; locale: string }) {
  const t = useTranslations("clients.map");

  const bounds = L.latLngBounds(clients.map((c) => [c.latitude, c.longitude] as [number, number]));

  function formatVisit(iso: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="h-[70vh] w-full overflow-hidden rounded-lg border border-border shadow-sm">
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [40, 40], maxZoom: 15 }}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {clients.map((c) => (
          <Marker key={c.id} position={[c.latitude, c.longitude]} icon={statusIcon(c.status)}>
            <Popup>
              <div className="flex flex-col gap-1 text-sm">
                <span className="font-medium">{c.companyName}</span>
                <span className="text-muted-foreground">
                  {formatVisit(c.nextVisitAt) ?? t("noVisit")}
                </span>
                <Link href={`/clientes/${c.id}`} className="text-primary hover:underline">
                  {t("viewClient")}
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
