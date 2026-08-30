import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-8 w-32" />
      </div>

      <div className="rounded-lg border border-border bg-card p-2 shadow-sm sm:p-4">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
