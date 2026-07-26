import { Skeleton } from "@/components/ui/skeleton";

export function GameplaySkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading gameplay"
      className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto p-4"
    >
      {/* Word row placeholders */}
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-2">
          {Array.from({ length: 5 }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-14 w-14 rounded-md" />
          ))}
        </div>
      ))}

      {/* Keyboard placeholder */}
      <div className="flex flex-col gap-2 w-full max-w-sm mt-4">
        {[10, 9, 7].map((keys, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1.5">
            {Array.from({ length: keys }).map((_, i) => (
              <Skeleton key={i} className="h-10 flex-1 max-w-[2.5rem] rounded" />
            ))}
          </div>
        ))}
      </div>

      <span className="sr-only">Loading gameplay board…</span>
    </div>
  );
}
