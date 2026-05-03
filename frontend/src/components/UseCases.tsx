import { Store, Coffee, UtensilsCrossed, Shirt, Package, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const UseCaseCard = ({ useCase, index }: { useCase: any; index: number }) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });
  
  return (
    <div
      ref={ref}
      className={`bg-card rounded-2xl p-8 border border-border hover:shadow-xl transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${useCase.gradient} flex items-center justify-center mb-6 shadow-md`}>
        <useCase.icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-xl font-semibold mb-3">{useCase.title}</h3>
      <p className="text-muted-foreground leading-relaxed mb-4">
        {useCase.description}
      </p>
      <ul className="space-y-2">
        {useCase.features.map((feature: string, idx: number) => (
          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
};

const UseCases = () => {
  const { t } = useTranslation();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation({ threshold: 0.2 });
  
  const useCases = [
    {
      icon: Store,
      title: t('useCases.retail.title'),
      description: t('useCases.retail.description'),
      gradient: "from-blue-500 to-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20"
    },
    {
      icon: Coffee,
      title: t('useCases.cafe.title'),
      description: t('useCases.cafe.description'),
      gradient: "from-orange-500 to-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/20"
    },
    {
      icon: UtensilsCrossed,
      title: t('useCases.restaurant.title'),
      description: t('useCases.restaurant.description'),
      gradient: "from-pink-500 to-pink-400",
      bgColor: "bg-pink-50 dark:bg-pink-950/20"
    },
    {
      icon: Shirt,
      title: t('useCases.fashion.title'),
      description: t('useCases.fashion.description'),
      gradient: "from-purple-500 to-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/20"
    },
    {
      icon: Package,
      title: t('useCases.wholesale.title'),
      description: t('useCases.wholesale.description'),
      gradient: "from-green-500 to-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20"
    },
    {
      icon: Smartphone,
      title: t('useCases.mobile.title'),
      description: t('useCases.mobile.description'),
      gradient: "from-indigo-500 to-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/20"
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
            {t('useCases.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('useCases.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="group bg-card rounded-2xl p-8 border border-border hover:shadow-xl transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${useCase.gradient} flex items-center justify-center mb-6 shadow-lg`}>
                <useCase.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{useCase.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                {useCase.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UseCases;
