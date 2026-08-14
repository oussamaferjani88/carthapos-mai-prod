import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function BISkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border p-4 space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function BISkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: count }).map((_, i) => (
        <BISkeletonCard key={i} />
      ))}
    </div>
  );
}
