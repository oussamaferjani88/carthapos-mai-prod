import { Sparkles, Puzzle, Settings, Rocket, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const StepCard = ({ step, index }: { step: any; index: number }) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });
  
  return (
    <div 
      ref={ref}
      className={`relative group transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      {/* Arrow between steps */}
      {index < 3 && (
        <div className="hidden lg:flex absolute top-20 -right-4 z-10 text-muted-foreground/30">
          <ArrowRight className="w-8 h-8" />
        </div>
      )}
      
      {/* Number Badge */}
      <div className={`absolute -top-4 -right-4 w-12 h-12 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg z-10`}>
        {step.number}
      </div>
      
      {/* Card */}
      <div className="relative bg-card border border-border rounded-2xl p-8 hover:shadow-xl transition-all duration-300 h-full">
        {/* Icon */}
        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-6 shadow-lg`}>
          <step.icon className="w-8 h-8 text-white" />
        </div>
        
        {/* Content */}
        <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {step.description}
        </p>
      </div>
    </div>
  );
};

const HowItWorks = () => {
  const { t } = useTranslation();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation({ threshold: 0.2 });
  
  const steps = [
    {
      icon: Sparkles,
      step: t('howItWorks.step1.step'),
      title: t('howItWorks.step1.title'),
      description: t('howItWorks.step1.description'),
      gradient: "from-blue-500 to-blue-400",
      number: "01"
    },
    {
      icon: Puzzle,
      step: t('howItWorks.step2.step'),
      title: t('howItWorks.step2.title'),
      description: t('howItWorks.step2.description'),
      gradient: "from-green-500 to-green-400",
      number: "02"
    },
    {
      icon: Settings,
      step: t('howItWorks.step3.step'),
      title: t('howItWorks.step3.title'),
      description: t('howItWorks.step3.description'),
      gradient: "from-orange-500 to-orange-400",
      number: "03"
    },
    {
      icon: Rocket,
      step: t('howItWorks.step4.step'),
      title: t('howItWorks.step4.title'),
      description: t('howItWorks.step4.description'),
      gradient: "from-purple-500 to-purple-400",
      number: "04"
    }
  ];

  return (
    <section className="py-24 px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div 
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t('howItWorks.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('howItWorks.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {steps.map((step, index) => (
            <StepCard key={index} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
