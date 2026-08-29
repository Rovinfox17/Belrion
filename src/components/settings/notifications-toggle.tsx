"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellIcon, BellOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePushSubscription, savePushSubscription } from "@/app/actions/push-subscriptions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

type Status = "unsupported" | "loading" | "denied" | "subscribed" | "unsubscribed";

export function NotificationsToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
      const registration = await Promise.race([navigator.serviceWorker.ready, timeout]).catch(
        () => null
      );
      const subscription = await registration?.pushManager.getSubscription();
      setStatus(subscription ? "subscribed" : "unsubscribed");
    }
    checkStatus();
  }, []);

  async function handleEnable() {
    setIsPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        toast.error("Faltan las claves de notificaciones push.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const json = subscription.toJSON();
      const result = await savePushSubscription({
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      });

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      setStatus("subscribed");
      toast.success("Notificaciones activadas");
    } catch {
      toast.error("No se pudieron activar las notificaciones.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleDisable() {
    setIsPending(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await deletePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
      toast.success("Notificaciones desactivadas");
    } catch {
      toast.error("No se pudieron desactivar las notificaciones.");
    } finally {
      setIsPending(false);
    }
  }

  if (status === "loading") return null;

  if (status === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        Tu navegador no admite notificaciones push.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-sm text-muted-foreground">
        Bloqueaste las notificaciones para Belrion. Actívalas desde los ajustes de tu
        navegador para recibir recordatorios de visitas.
      </p>
    );
  }

  if (status === "subscribed") {
    return (
      <Button variant="outline" onClick={handleDisable} disabled={isPending}>
        <BellOffIcon />
        Desactivar notificaciones
      </Button>
    );
  }

  return (
    <Button onClick={handleEnable} disabled={isPending}>
      <BellIcon />
      Activar notificaciones
    </Button>
  );
}
