import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useTranslation } from "react-i18next";
import GlassSurface from "./GlassSurface";

const Navbar = () => {
  const { t } = useTranslation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <GlassSurface 
        width="100%"
        height={64}
        borderRadius={0}
        displace={8}
        distortionScale={-150}
        redOffset={3}
        greenOffset={12}
        blueOffset={18}
        brightness={65}
        opacity={0.85}
        backgroundOpacity={0.1}
        saturation={1.2}
        mixBlendMode="screen"
        className="border-b border-border/50"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-xl font-semibold tracking-tight">Carthapos</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium hover:text-foreground/80 transition-colors">
              Home
            </Link>
            <Link to="/features" className="text-sm font-medium hover:text-foreground/80 transition-colors">
              {t('nav.features')}
            </Link>
            <Link to="/docs" className="text-sm font-medium hover:text-foreground/80 transition-colors">
              Docs
            </Link>
            <Link to="/blog" className="text-sm font-medium hover:text-foreground/80 transition-colors">
              Blog
            </Link>
            <Link to="/contact" className="text-sm font-medium hover:text-foreground/80 transition-colors">
              Contact
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <Link to="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                {t('auth.login')}
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm">{t('nav.getStarted')}</Button>
            </Link>
          </div>
          </div>
        </div>
      </GlassSurface>
    </nav>
  );
};

export default Navbar;
