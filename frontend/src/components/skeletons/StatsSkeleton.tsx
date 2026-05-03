import { Skeleton } from "@/components/ui/skeleton";

const StatsSkeleton = () => {
  return (
    <section className="py-20 px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-12 w-24 mx-auto mb-2" />
              <Skeleton className="h-6 w-32 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSkeleton;
