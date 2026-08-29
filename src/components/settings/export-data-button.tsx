"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportMyData } from "@/app/actions/account";

export function ExportDataButton() {
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const result = await exportMyData();
      if (result.error || !result.data) {
        toast.error(result.error ?? "No se pudieron exportar los datos.");
        return;
      }

      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `belrion-datos-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Datos exportados");
    });
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={isPending} className="w-fit">
      <DownloadIcon />
      {isPending ? "Exportando…" : "Exportar mis datos"}
    </Button>
  );
}
