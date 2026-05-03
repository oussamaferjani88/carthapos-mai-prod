import { Skeleton } from "@/components/ui/skeleton";

const TestimonialsSkeleton = () => {
  return (
    <section className="py-24 px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Skeleton className="h-10 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-8 rounded-xl border bg-card">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Skeleton key={j} className="h-5 w-5" />
                ))}
              </div>
              <Skeleton className="h-20 w-full mb-6" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSkeleton;
