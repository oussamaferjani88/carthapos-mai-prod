import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const CustomPricing = () => {
  const { t } = useTranslation();
  
  const features = [
    t('pricing.features.payPerUse'),
    t('pricing.features.licensing'),
    t('pricing.features.deployment'),
    t('pricing.features.support'),
    t('pricing.features.updates'),
  ];

  return (
    <section className="py-24 px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('pricing.title')}</h2>
          <p className="text-xl text-text-muted mb-12 max-w-2xl mx-auto">
            {t('pricing.description')}
          </p>

          {/* Feature List */}
          <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-12">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-left">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm text-foreground/80">{feature}</span>
              </div>
            ))}
          </div>

          <Button size="lg">{t('pricing.cta')}</Button>
        </div>
      </div>
    </section>
  );
};

export default CustomPricing;
