import { Skeleton } from "@/components/ui/skeleton";

const AuthSkeleton = () => {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background animation placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10" />
      
      {/* Form skeleton */}
      <div className="w-full max-w-md relative z-10">
        <div className="p-8 rounded-2xl border bg-background/95 backdrop-blur-sm shadow-xl">
          <div className="text-center mb-8">
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>

          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>

          <Skeleton className="h-10 w-full mt-6" />

          <div className="mt-6 text-center">
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthSkeleton;
