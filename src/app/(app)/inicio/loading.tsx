import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <Skeleton className="h-5 w-40" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CardSkeleton rows={2} />
        <CardSkeleton rows={3} />
        <div className="lg:col-span-2">
          <CardSkeleton rows={4} />
        </div>
      </div>
    </div>
  );
}
