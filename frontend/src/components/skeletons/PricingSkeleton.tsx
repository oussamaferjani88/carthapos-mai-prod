import { Skeleton } from "@/components/ui/skeleton";

const PricingSkeleton = () => {
  return (
    <section className="py-24 px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Skeleton className="h-10 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="p-8 rounded-2xl border bg-card">
            <div className="text-center mb-8">
              <Skeleton className="h-8 w-48 mx-auto mb-4" />
              <Skeleton className="h-6 w-64 mx-auto" />
            </div>

            <div className="space-y-4 mb-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>

            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSkeleton;
