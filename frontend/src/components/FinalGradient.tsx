import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import posUserImage from "@/assets/pos-user.jpg";

const FinalGradient = () => {
  return (
    <section className="py-0 px-6 lg:px-8 mb-20">
      <div className="max-w-7xl mx-auto">
        <div className="relative gradient-purple-orange rounded-[3rem] overflow-hidden min-h-[600px] flex items-center">
          {/* Background Image */}
          <div className="absolute inset-0 opacity-40">
            <img
              src={posUserImage}
              alt="Professional using POS system"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"></div>

          {/* Content */}
          <div className="relative z-10 px-8 md:px-16 lg:px-24 py-20 max-w-2xl">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight">
              Build POS Systems That Match Your Workflow
              <span className="text-white/80"> — Not The Other Way Around</span>
            </h2>
            <Button size="lg" variant="secondary" className="group bg-white text-foreground hover:bg-white/90">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          {/* Decorative gradient orbs */}
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-orange opacity-30 rounded-full blur-3xl"></div>
        </div>
      </div>
    </section>
  );
};

export default FinalGradient;
