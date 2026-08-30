import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-48" />

      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>

      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
