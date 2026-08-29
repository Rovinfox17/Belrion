"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { SunIcon, MoonIcon, MonitorIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const OPTIONS = [
  { value: "light", label: "Claro", icon: SunIcon },
  { value: "dark", label: "Oscuro", icon: MoonIcon },
  { value: "system", label: "Automático", icon: MonitorIcon },
] as const;

export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-8" />;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((o) => {
        const Icon = o.icon;
        const active = theme === o.value;
        return (
          <Button
            key={o.value}
            type="button"
            variant={active ? "default" : "outline"}
            size="sm"
            onClick={() => setTheme(o.value)}
          >
            <Icon className="size-4" />
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}
