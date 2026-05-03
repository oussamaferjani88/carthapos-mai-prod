import { Zap, Package, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Features = () => {
  const { t } = useTranslation();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation({ threshold: 0.2 });
  
  const features = [
    {
      icon: Zap,
      title: t('features.generator.title'),
      description: t('features.generator.description'),
    },
    {
      icon: Package,
      title: t('features.library.title'),
      description: t('features.library.description'),
    },
    {
      icon: Download,
      title: t('features.export.title'),
      description: t('features.export.description'),
    },
  ];

  return (
    <section className="py-24 px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div 
          ref={headerRef}
          className={`grid lg:grid-cols-2 gap-12 items-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              {t('features.title')}{" "}
              <span className="text-foreground/70">
                {t('features.titleHighlight')}
              </span>
            </h2>
          </div>
          <div>
            <p className="text-lg text-text-muted leading-relaxed">
              {t('features.description')}
            </p>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-background rounded-2xl p-8 hover:shadow-lg transition-all duration-300 animate-slide-up border border-border"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-text-muted leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
