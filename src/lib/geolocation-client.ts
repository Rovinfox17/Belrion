export type CheckinCoords = { latitude: number; longitude: number; accuracy: number };

/** Pide la ubicación del dispositivo al navegador; nunca rechaza — si no
 * hay soporte, el usuario deniega el permiso, o se agota el tiempo,
 * resuelve `null` para que quien llame pueda seguir sin bloquear nada. */
export function getCurrentPositionSafe(timeoutMs = 8000): Promise<CheckinCoords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 0 }
    );
  });
}
