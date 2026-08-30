"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

export function SortableColumnHeader({
  label,
  field,
  defaultDir = "asc",
}: {
  label: string;
  field: string;
  defaultDir?: "asc" | "desc";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get("sort") ?? "alfabetico";
  const isActive = currentSort === field;
  const rawDir = searchParams.get("dir");
  const activeDir: "asc" | "desc" =
    rawDir === "asc" || rawDir === "desc" ? rawDir : defaultDir;

  function handleClick() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", field);
    params.set("dir", isActive ? (activeDir === "asc" ? "desc" : "asc") : defaultDir);
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-1 transition-colors hover:text-foreground"
    >
      {label}
      {isActive &&
        (activeDir === "asc" ? (
          <ArrowUpIcon className="size-3" />
        ) : (
          <ArrowDownIcon className="size-3" />
        ))}
    </button>
  );
}
