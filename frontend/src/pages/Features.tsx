import { useTranslation } from "react-i18next";
import { Check, Zap, Shield, Cloud, Code, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import FeaturesSkeleton from "@/components/skeletons/FeaturesSkeleton";

const Features = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate content loading
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <FeaturesSkeleton />;
  }

  const features = [
    {
      icon: Zap,
      title: t('featuresPage.features.fast.title'),
      description: t('featuresPage.features.fast.description')
    },
    {
      icon: Shield,
      title: t('featuresPage.features.secure.title'),
      description: t('featuresPage.features.secure.description')
    },
    {
      icon: Cloud,
      title: t('featuresPage.features.storage.title'),
      description: t('featuresPage.features.storage.description')
    },
    {
      icon: Code,
      title: t('featuresPage.features.noCode.title'),
      description: t('featuresPage.features.noCode.description')
    },
    {
      icon: Users,
      title: t('featuresPage.features.multiUser.title'),
      description: t('featuresPage.features.multiUser.description')
    }
  ];

  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            {t('featuresPage.title')}
          </h1>
          <p className="text-xl text-text-muted max-w-3xl mx-auto mb-10">
            {t('featuresPage.subtitle')}
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-background rounded-2xl p-8 hover:shadow-lg transition-all duration-300 border border-border"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Details */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
            <div>
              <h2 className="text-4xl font-bold mb-6">{t('featuresPage.customization.title')}</h2>
              <p className="text-lg text-text-muted mb-6">
                {t('featuresPage.customization.description')}
              </p>
              <ul className="space-y-4">
                {[
                  t('featuresPage.customization.list.inventory'),
                  t('featuresPage.customization.list.sales'),
                  t('featuresPage.customization.list.customers'),
                  t('featuresPage.customization.list.analytics'),
                  t('featuresPage.customization.list.multiLocation')
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl h-96 flex items-center justify-center">
              <p className="text-text-muted">Feature Visualization</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl h-96 flex items-center justify-center order-2 lg:order-1">
              <p className="text-text-muted">Deployment Visualization</p>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl font-bold mb-6">{t('featuresPage.deployment.title')}</h2>
              <p className="text-lg text-text-muted mb-6">
                {t('featuresPage.deployment.description')}
              </p>
              <Button size="lg">{t('featuresPage.deployment.cta')}</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Features;
