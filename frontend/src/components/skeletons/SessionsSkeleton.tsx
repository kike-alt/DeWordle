import { Skeleton } from "@/components/ui/skeleton";

export function SessionsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading sessions"
      className="flex flex-col gap-4 w-full max-w-4xl mx-auto p-4"
    >
      <Skeleton className="h-7 w-48 rounded" />
      <Skeleton className="h-4 w-80 rounded" />

      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3"
        >
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        </div>
      ))}

      <span className="sr-only">Loading sessions…</span>
    </div>
  );
}
