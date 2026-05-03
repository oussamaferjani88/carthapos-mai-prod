import { Skeleton } from "@/components/ui/skeleton";

const DocsSkeleton = () => {
  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <Skeleton className="h-14 w-96 mx-auto mb-6" />
          <Skeleton className="h-6 w-2/3 mx-auto" />
        </div>
      </section>

      {/* Search */}
      <section className="py-8 px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-12 w-full" />
        </div>
      </section>

      {/* Documentation Sections */}
      <section className="py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-8 rounded-lg border bg-card">
                <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                <Skeleton className="h-7 w-48 mb-3" />
                <Skeleton className="h-4 w-full mb-6" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <Skeleton key={j} className="h-4 w-3/4" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Resources */}
      <section className="py-16 px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-8 w-64 mx-auto mb-12" />
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-6 rounded-lg border bg-card text-center">
                <Skeleton className="h-12 w-12 rounded-lg mx-auto mb-4" />
                <Skeleton className="h-6 w-32 mx-auto mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DocsSkeleton;
