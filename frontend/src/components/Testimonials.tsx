import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Testimonials = () => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation({ threshold: 0.2 });
  const { ref: featuredRef, isVisible: featuredVisible } = useScrollAnimation({ threshold: 0.2 });
  
  const testimonials = [
    {
      name: t('testimonials.testimonial1.name'),
      role: t('testimonials.testimonial1.role'),
      company: t('testimonials.testimonial1.company'),
      content: t('testimonials.testimonial1.content'),
      rating: 5,
      avatar: "SM",
      color: "bg-gradient-to-br from-pink-500 to-pink-600"
    },
    {
      name: t('testimonials.testimonial2.name'),
      role: t('testimonials.testimonial2.role'),
      company: t('testimonials.testimonial2.company'),
      content: t('testimonials.testimonial2.content'),
      rating: 5,
      avatar: "JR",
      color: "bg-gradient-to-br from-blue-500 to-blue-600"
    },
    {
      name: t('testimonials.testimonial3.name'),
      role: t('testimonials.testimonial3.role'),
      company: t('testimonials.testimonial3.company'),
      content: t('testimonials.testimonial3.content'),
      rating: 5,
      avatar: "EC",
      color: "bg-gradient-to-br from-rose-500 to-rose-600"
    }
  ];

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <section className="py-24 px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div 
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t('testimonials.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('testimonials.subtitle')}
          </p>
        </div>

        {/* Featured Testimonial */}
        <div 
          ref={featuredRef}
          className={`mb-12 transition-all duration-700 ${
            featuredVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <div className="max-w-4xl mx-auto bg-card rounded-3xl p-12 border border-border shadow-2xl transition-all duration-500">
            {/* Rating */}
            <div className="flex gap-1 mb-6 justify-center">
              {[...Array(testimonials[activeIndex].rating)].map((_, i) => (
                <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              ))}
            </div>

            {/* Content */}
            <p className="text-foreground text-xl md:text-2xl mb-8 leading-relaxed text-center">
              "{testimonials[activeIndex].content}"
            </p>

            {/* Author */}
            <div className="flex items-center justify-center gap-4">
              <div className={`w-16 h-16 rounded-full ${testimonials[activeIndex].color} flex items-center justify-center shadow-lg`}>
                <span className="text-xl font-bold text-white">
                  {testimonials[activeIndex].avatar}
                </span>
              </div>
              <div className="text-left">
                <div className="font-bold text-lg">{testimonials[activeIndex].name}</div>
                <div className="text-sm text-muted-foreground">
                  {testimonials[activeIndex].role}, {testimonials[activeIndex].company}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dots Navigation */}
        <div className="flex justify-center gap-2 mb-12">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === activeIndex 
                  ? 'w-8 bg-gradient-to-r from-pink-500 to-purple-500' 
                  : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* All Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`bg-card rounded-2xl p-6 border transition-all duration-300 cursor-pointer animate-slide-up ${
                index === activeIndex 
                  ? 'border-primary shadow-lg scale-105' 
                  : 'border-border hover:border-primary/50 hover:shadow-md'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Content */}
              <p className="text-foreground/80 text-sm mb-4 leading-relaxed line-clamp-3">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full ${testimonial.color} flex items-center justify-center shadow`}>
                  <span className="text-sm font-bold text-white">
                    {testimonial.avatar}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-sm">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
