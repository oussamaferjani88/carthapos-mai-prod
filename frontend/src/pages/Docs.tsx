import { useTranslation } from "react-i18next";
import { Book, Code, Rocket, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import DocsSkeleton from "@/components/skeletons/DocsSkeleton";

const Docs = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <DocsSkeleton />;
  }

  const sections = [
    {
      icon: Rocket,
      title: t('docsPage.sections.gettingStarted.title'),
      description: t('docsPage.sections.gettingStarted.description'),
      links: [
        t('docsPage.sections.gettingStarted.links.quickStart'),
        t('docsPage.sections.gettingStarted.links.requirements'),
        t('docsPage.sections.gettingStarted.links.installation')
      ]
    },
    {
      icon: Settings,
      title: t('docsPage.sections.configuration.title'),
      description: t('docsPage.sections.configuration.description'),
      links: [
        t('docsPage.sections.configuration.links.moduleSetup'),
        t('docsPage.sections.configuration.links.storage'),
        t('docsPage.sections.configuration.links.permissions')
      ]
    },
    {
      icon: Code,
      title: t('docsPage.sections.api.title'),
      description: t('docsPage.sections.api.description'),
      links: [
        t('docsPage.sections.api.links.rest'),
        t('docsPage.sections.api.links.webhooks'),
        t('docsPage.sections.api.links.auth')
      ]
    },
    {
      icon: Book,
      title: t('docsPage.sections.bestPractices.title'),
      description: t('docsPage.sections.bestPractices.description'),
      links: [
        t('docsPage.sections.bestPractices.links.performance'),
        t('docsPage.sections.bestPractices.links.security'),
        t('docsPage.sections.bestPractices.links.deployment')
      ]
    }
  ];

  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="py-20 px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            {t('docsPage.title')}
          </h1>
          <p className="text-xl text-text-muted max-w-3xl mx-auto mb-10">
            {t('docsPage.subtitle')}
          </p>
          <div className="max-w-2xl mx-auto">
            <input
              type="text"
              placeholder={t('docsPage.searchPlaceholder')}
              className="w-full px-6 py-4 rounded-lg border border-border bg-background"
            />
          </div>
        </div>
      </section>

      {/* Documentation Grid */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {sections.map((section, index) => (
              <div
                key={index}
                className="bg-background rounded-2xl p-8 border border-border hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <section.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">{section.title}</h3>
                <p className="text-text-muted mb-6">{section.description}</p>
                <ul className="space-y-3">
                  {section.links.map((link, i) => (
                    <li key={i}>
                      <a href="#" className="text-primary hover:underline">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 bg-primary/5 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">{t('docsPage.help.title')}</h2>
            <p className="text-lg text-text-muted mb-6">
              {t('docsPage.help.description')}
            </p>
            <Button size="lg">{t('docsPage.help.cta')}</Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Docs;
