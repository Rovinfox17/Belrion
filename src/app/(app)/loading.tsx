import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Skeleton className="h-8 w-full sm:max-w-xs" />
        <Skeleton className="h-8 w-full sm:w-44" />
        <Skeleton className="h-8 w-full sm:w-44" />
        <Skeleton className="h-8 w-full sm:w-44" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center gap-6 border-b border-border bg-accent px-4 py-2.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-6 border-t border-border px-4 py-3 first:border-t-0"
          >
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
