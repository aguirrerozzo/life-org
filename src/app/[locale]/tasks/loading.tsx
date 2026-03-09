import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-screen">
      {/* Sidebar skeleton */}
      <div className="hidden md:block w-60 border-r p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-full" />
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-4 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-72 space-y-3">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
