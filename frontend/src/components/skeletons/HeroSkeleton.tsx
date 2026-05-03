import { Skeleton } from "@/components/ui/skeleton";

const HeroSkeleton = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto text-center z-10 w-full">
        <Skeleton className="h-16 w-3/4 mx-auto mb-6" />
        <Skeleton className="h-12 w-2/3 mx-auto mb-6" />
        <Skeleton className="h-6 w-2/3 mx-auto mb-4" />
        <Skeleton className="h-6 w-1/2 mx-auto mb-10" />
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Skeleton className="h-12 w-40" />
          <Skeleton className="h-12 w-40" />
        </div>
      </div>
    </section>
  );
};

export default HeroSkeleton;
