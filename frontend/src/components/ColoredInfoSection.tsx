import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, TrendingUp, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const ColoredInfoSection = () => {
  const { t } = useTranslation();
  
  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      titleKey: "home.coloredSection.feature1Title",
      descKey: "home.coloredSection.feature1Desc"
    },
    {
      icon: <Users className="w-6 h-6" />,
      titleKey: "home.coloredSection.feature2Title",
      descKey: "home.coloredSection.feature2Desc"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      titleKey: "home.coloredSection.feature3Title",
      descKey: "home.coloredSection.feature3Desc"
    }
  ];

  const benefitKeys = [
    "home.coloredSection.benefit1",
    "home.coloredSection.benefit2",
    "home.coloredSection.benefit3",
    "home.coloredSection.benefit4",
    "home.coloredSection.benefit5",
    "home.coloredSection.benefit6"
  ];

  return (
    <section className="relative py-32 px-4 overflow-hidden">
      {/* Faded Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
      
      {/* Decorative Blobs */}
      <div className="absolute top-20 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left Side - Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full mb-6">
              <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t("home.coloredSection.badge")}
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              {t("home.coloredSection.title")}{" "}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {t("home.coloredSection.titleHighlight")}
              </span>
            </h2>

            <p className="text-xl text-muted-foreground mb-8">
              {t("home.coloredSection.description")}
            </p>

            {/* Feature Cards */}
            <div className="grid gap-4 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50 hover:border-purple-500/50 transition-colors"
                >
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{t(feature.titleKey)}</h3>
                    <p className="text-sm text-muted-foreground">{t(feature.descKey)}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Link to="/register">
              <Button size="lg" className="group">
                {t("home.coloredSection.ctaButton")}
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>

          {/* Right Side - Benefits Checklist */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="p-8 rounded-3xl bg-background/80 backdrop-blur-xl border border-border shadow-2xl">
              <h3 className="text-2xl font-bold mb-6">{t("home.coloredSection.benefitsTitle")}</h3>
              
              <div className="space-y-4">
                {benefitKeys.map((benefitKey, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-foreground/90">{t(benefitKey)}</span>
                  </motion.div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-border">
                <div className="text-center">
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    99.9%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{t("home.coloredSection.statUptime")}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    10K+
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{t("home.coloredSection.statUsers")}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent">
                    4.9★
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{t("home.coloredSection.statRating")}</div>
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="absolute -top-4 -right-4 bg-gradient-to-br from-blue-500 to-purple-500 text-white px-6 py-3 rounded-full shadow-xl"
            >
              <div className="text-sm font-semibold">{t("home.coloredSection.floatingBadge")}</div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ColoredInfoSection;
