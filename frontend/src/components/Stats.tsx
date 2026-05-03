import { useTranslation } from "react-i18next";
import { useScrollAnimation, useCountAnimation } from "@/hooks/useScrollAnimation";

const StatItem = ({ number, label, description, index }: { number: string; label: string; description: string; index: number }) => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3 });
  
  // Extract numeric value for counting animation
  const numericValue = parseInt(number.replace(/[^0-9]/g, '')) || 0;
  const suffix = number.replace(/[0-9]/g, '');
  const count = useCountAnimation(numericValue, 2000, isVisible);

  return (
    <div 
      ref={ref}
      className={`text-center transition-all duration-700 ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-10'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-br from-primary to-purple-600 bg-clip-text text-transparent">
        {count}{suffix}
      </div>
      <div className="text-base md:text-lg font-semibold mb-1">
        {label}
      </div>
      <div className="text-sm text-muted-foreground">
        {description}
      </div>
    </div>
  );
};

const Stats = () => {
  const { t } = useTranslation();
  
  const stats = [
    {
      number: t('stats.modules.number'),
      label: t('stats.modules.label'),
      description: t('stats.modules.description')
    },
    {
      number: t('stats.systems.number'),
      label: t('stats.systems.label'),
      description: t('stats.systems.description')
    },
    {
      number: t('stats.uptime.number'),
      label: t('stats.uptime.label'),
      description: t('stats.uptime.description')
    },
    {
      number: t('stats.support.number'),
      label: t('stats.support.label'),
      description: t('stats.support.description')
    }
  ];

  return (
    <section className="py-20 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <StatItem
              key={index}
              number={stat.number}
              label={stat.label}
              description={stat.description}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
