import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSkeleton from "@/components/skeletons/HeroSkeleton";
import StatsSkeleton from "@/components/skeletons/StatsSkeleton";
import FeaturesSkeleton from "@/components/skeletons/FeaturesSkeleton";
import HowItWorksSkeleton from "@/components/skeletons/HowItWorksSkeleton";
import UseCasesSkeleton from "@/components/skeletons/UseCasesSkeleton";
import TestimonialsSkeleton from "@/components/skeletons/TestimonialsSkeleton";
import PricingSkeleton from "@/components/skeletons/PricingSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load components
const Hero = lazy(() => import("@/components/Hero"));
const GradientVisual = lazy(() => import("@/components/GradientVisual"));
const Stats = lazy(() => import("@/components/Stats"));
const Features = lazy(() => import("@/components/Features"));
const HowItWorks = lazy(() => import("@/components/HowItWorks"));
const HumanTouch = lazy(() => import("@/components/HumanTouch"));
const ColoredInfoSection = lazy(() => import("@/components/ColoredInfoSection"));
const UseCases = lazy(() => import("@/components/UseCases"));
const Testimonials = lazy(() => import("@/components/Testimonials"));
const CustomPricing = lazy(() => import("@/components/CustomPricing"));
const FinalGradient = lazy(() => import("@/components/FinalGradient"));

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <main>
        <Suspense fallback={<HeroSkeleton />}>
          <Hero />
        </Suspense>
        
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <GradientVisual />
        </Suspense>
        
        <Suspense fallback={<StatsSkeleton />}>
          <Stats />
        </Suspense>
        
        <Suspense fallback={<FeaturesSkeleton />}>
          <Features />
        </Suspense>
        
        <Suspense fallback={<HowItWorksSkeleton />}>
          <HowItWorks />
        </Suspense>
        
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <HumanTouch />
        </Suspense>
        
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <ColoredInfoSection />
        </Suspense>
        
        <Suspense fallback={<UseCasesSkeleton />}>
          <UseCases />
        </Suspense>
        
        <Suspense fallback={<TestimonialsSkeleton />}>
          <Testimonials />
        </Suspense>
        
        <Suspense fallback={<PricingSkeleton />}>
          <CustomPricing />
        </Suspense>
        
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <FinalGradient />
        </Suspense>
      </main>
    </div>
  );
};

export default Index;
