import { Skeleton } from "@/components/ui/skeleton";

export function AchievementsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading achievements"
      className="flex flex-col gap-6 w-full max-w-2xl mx-auto p-4"
    >
      {/* Section heading */}
      <Skeleton className="h-7 w-44 rounded" />

      {/* Achievement rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-white/10 p-4"
        >
          {/* Badge icon */}
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />

          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-3 w-56 rounded" />
            {/* Progress bar */}
            <Skeleton className="h-2 w-full rounded-full" />
          </div>

          {/* Points badge */}
          <Skeleton className="h-8 w-16 rounded-full shrink-0" />
        </div>
      ))}

      <span className="sr-only">Loading achievements…</span>
    </div>
  );
}
