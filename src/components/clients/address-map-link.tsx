"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPinIcon } from "lucide-react";

export function AddressMapLink({ address }: { address: string }) {
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address
  )}`;
  const [href, setHref] = useState(googleMapsUrl);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isApple = /iPhone|iPad|iPod|Macintosh/.test(ua);
    if (isApple) {
      setHref(`https://maps.apple.com/?q=${encodeURIComponent(address)}`);
    }
  }, [address]);

  return (
    <Button
      variant="outline"
      size="sm"
      nativeButton={false}
      render={
        <a href={href} target="_blank" rel="noopener noreferrer">
          <MapPinIcon />
          Cómo llegar
        </a>
      }
    />
  );
}
