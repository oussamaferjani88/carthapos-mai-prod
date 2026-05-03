import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const HumanTouch = () => {
  const { t } = useTranslation();
  
  const cards = [
    {
      titleKey: "home.humanTouch.card1Title",
      image: "https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&auto=format&fit=crop",
    },
    {
      titleKey: "home.humanTouch.card2Title",
      image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&auto=format&fit=crop",
    },
    {
      titleKey: "home.humanTouch.card3Title",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop",
    }
  ];

  return (
    <section className="py-24 px-4 bg-gradient-to-b from-background to-accent/20">
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {t("home.humanTouch.title")}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("home.humanTouch.subtitle")}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative h-80 rounded-3xl overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              {/* Background Image */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundImage: `url(${card.image})` }}
              />
              
              {/* Subtle bottom gradient for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              
              {/* Content */}
              <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <h3 className="text-2xl font-bold text-white leading-tight drop-shadow-lg">
                  {t(card.titleKey)}
                </h3>
              </div>

              {/* Hover Effect Border */}
              <div className="absolute inset-0 border-4 border-white/20 rounded-3xl pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HumanTouch;
