"use client";

import dynamic from "next/dynamic";

// Leaflet toca `window`/`document` al montar el mapa, así que no puede
// renderizarse en el servidor — `ssr: false` solo se permite dentro de un
// componente cliente, de ahí este envoltorio separado del componente real
// (client-map.tsx), que sí puede importarse desde una página de servidor.
export const ClientMap = dynamic(() => import("./client-map").then((m) => m.ClientMap), {
  ssr: false,
});

export type { MapClient } from "./client-map";
