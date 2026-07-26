import { Skeleton } from "@/components/ui/skeleton";

export function RewardsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading rewards"
      className="flex flex-col gap-6 w-full max-w-2xl mx-auto p-4"
    >
      {/* Section heading */}
      <Skeleton className="h-7 w-36 rounded" />

      {/* Reward cards grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-3 rounded-xl border border-white/10 p-5"
          >
            <Skeleton className="h-14 w-14 rounded-full" />
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        ))}
      </div>

      {/* Claim button placeholder */}
      <Skeleton className="h-12 w-40 rounded-xl self-center" />

      <span className="sr-only">Loading rewards…</span>
    </div>
  );
}
