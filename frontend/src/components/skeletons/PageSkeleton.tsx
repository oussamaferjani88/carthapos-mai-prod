import { Skeleton } from "@/components/ui/skeleton";
import HeroSkeleton from "./HeroSkeleton";
import StatsSkeleton from "./StatsSkeleton";
import FeaturesSkeleton from "./FeaturesSkeleton";

const PageSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      <main>
        <HeroSkeleton />
        <Skeleton className="h-96 w-full" />
        <StatsSkeleton />
        <FeaturesSkeleton />
        
        {/* How It Works Skeleton */}
        <section className="py-24 px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Skeleton className="h-10 w-64 mx-auto mb-4" />
              <Skeleton className="h-6 w-96 mx-auto" />
            </div>
            <div className="space-y-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col md:flex-row items-center gap-8">
                  <Skeleton className="h-64 w-full md:w-1/2 rounded-lg" />
                  <div className="w-full md:w-1/2 space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Skeleton */}
        <section className="py-24 px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Skeleton className="h-10 w-64 mx-auto mb-4" />
              <Skeleton className="h-6 w-96 mx-auto" />
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-6 rounded-lg border bg-card">
                  <Skeleton className="h-20 w-full mb-4" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Skeleton */}
        <section className="py-24 px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Skeleton className="h-10 w-64 mx-auto mb-4" />
              <Skeleton className="h-6 w-96 mx-auto" />
            </div>
            <div className="max-w-2xl mx-auto">
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PageSkeleton;
