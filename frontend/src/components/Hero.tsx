import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { WavyBackground } from "@/components/ui/wavy-background";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";

const Hero = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <WavyBackground
        backgroundFill={theme === "dark" ? "#0a0a0a" : "#ffffff"}
        colors={theme === "dark" 
          ? ["#0ea5e9", "#22d3ee", "#10b981", "#14b8a6", "#06b6d4"] // Blue and green glowing colors
          : ["#ff6b35", "#ff8c42", "#f75347", "#ff4500", "#dc143c"] // Orange/red colors for light mode
        }
        waveWidth={50}
        blur={10}
        speed="fast"
        waveOpacity={theme === "dark" ? 0.4 : 0.3}
        containerClassName="h-full w-full"
        className="flex items-center justify-center px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto animate-fade-in mt-20">
            {/* Subtitle */}
            <p className="text-xs font-semibold tracking-widest uppercase text-text-subtle mb-6">
              {t('hero.subtitle')}
            </p>

            {/* Main Title */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-balance leading-tight">
              {t('hero.title')}{" "}
              <span className="text-foreground/80">{t('hero.titleHighlight')}</span>
            </h1>

            {/* Description - Positioned lower with extra spacing */}
            <p className="text-lg md:text-xl text-text-muted mb-10 max-w-2xl mx-auto text-balance leading-relaxed mt-8">
              {t('hero.description')}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" className="group">
                {t('hero.ctaPrimary')}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="group">
                <Play className="mr-2 h-4 w-4" />
                {t('hero.ctaSecondary')}
              </Button>
            </div>
          </div>
        </div>
      </WavyBackground>
    </div>
  );
};

export default Hero;
