import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading profile"
      className="flex flex-col gap-6 w-full max-w-2xl mx-auto p-4"
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-4 w-56 rounded" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-white/10 p-4">
            <Skeleton className="h-8 w-12 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* Recent games list */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 p-3">
            <Skeleton className="h-10 w-10 rounded-md shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
        ))}
      </div>

      <span className="sr-only">Loading profile…</span>
    </div>
  );
}
