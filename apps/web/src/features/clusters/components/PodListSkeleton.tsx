import { Skeleton } from "#/components/ui/skeleton";

export function PodListSkeleton() {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Loading pods">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  );
}
