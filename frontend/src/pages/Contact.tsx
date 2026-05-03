import { useTranslation } from "react-i18next";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import ContactSkeleton from "@/components/skeletons/ContactSkeleton";

const Contact = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <ContactSkeleton />;
  }

  const contactInfo = [
    {
      icon: Mail,
      title: t('contactPage.info.email.title'),
      content: t('contactPage.info.email.value'),
      link: "mailto:support@carthapos.com"
    },
    {
      icon: Phone,
      title: t('contactPage.info.phone.title'),
      content: t('contactPage.info.phone.value'),
      link: "tel:+15551234567"
    },
    {
      icon: MapPin,
      title: t('contactPage.info.address.title'),
      content: t('contactPage.info.address.value'),
      link: "#"
    }
  ];

  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            {t('contactPage.title')}
          </h1>
          <p className="text-xl text-text-muted max-w-3xl mx-auto">
            {t('contactPage.subtitle')}
          </p>
        </div>
      </section>

      {/* Contact Form and Info */}
      <section className="py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-background rounded-2xl p-8 border border-border">
              <h2 className="text-3xl font-bold mb-6">{t('contactPage.form.title')}</h2>
              <form className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('contactPage.form.firstName')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('contactPage.form.firstNamePlaceholder')}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {t('contactPage.form.lastName')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('contactPage.form.lastNamePlaceholder')}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('contactPage.form.email')}
                  </label>
                  <input
                    type="email"
                    placeholder={t('contactPage.form.emailPlaceholder')}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('contactPage.form.company')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('contactPage.form.companyPlaceholder')}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('contactPage.form.subject')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('contactPage.form.subjectPlaceholder')}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('contactPage.form.message')}
                  </label>
                  <textarea
                    rows={5}
                    placeholder={t('contactPage.form.messagePlaceholder')}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background resize-none"
                  />
                </div>
                <Button size="lg" className="w-full group">
                  {t('contactPage.form.submit')}
                  <Send className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold mb-6">{t('contactPage.info.title')}</h2>
                <p className="text-text-muted mb-8">
                  {t('contactPage.info.description')}
                </p>
              </div>

              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <a
                    key={index}
                    href={info.link}
                    className="flex items-start gap-4 p-6 bg-background rounded-xl border border-border hover:shadow-lg transition-all duration-300 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <info.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{info.title}</h3>
                      <p className="text-text-muted">{info.content}</p>
                    </div>
                  </a>
                ))}
              </div>

              {/* Business Hours */}
              <div className="bg-muted/30 rounded-xl p-6">
                <h3 className="font-bold mb-4">{t('contactPage.hours.title')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t('contactPage.hours.weekdays')}</span>
                    <span className="font-medium">{t('contactPage.hours.weekdaysTime')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t('contactPage.hours.saturday')}</span>
                    <span className="font-medium">{t('contactPage.hours.saturdayTime')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">{t('contactPage.hours.sunday')}</span>
                    <span className="font-medium">{t('contactPage.hours.sundayTime')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl h-96 flex items-center justify-center">
            <p className="text-text-muted">Map Visualization</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
