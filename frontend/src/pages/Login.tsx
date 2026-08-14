import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Lock, Mail, ArrowLeft, Building, LogIn, Github, Chrome } from "lucide-react";
import AuthSkeleton from "@/components/skeletons/AuthSkeleton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { apiLogin, saveAuthSession, clearAccessModeIdentity } from "@/lib/auth";

const Login = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsPageLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isPageLoading) {
    return <AuthSkeleton />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const session = await apiLogin(formData.email.trim(), formData.password);
      saveAuthSession(session);
      clearAccessModeIdentity();

      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message || t("auth.loginError") || "Failed to login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Back to Home Button */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("auth.backToHome")}
      </Link>

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSwitcher />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-7xl shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-[45%_55%] min-h-[700px]">
            {/* Left Side - Gradient */}
            <div className="relative p-12 flex flex-col justify-between bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
              <div>
                <div className="flex items-center gap-2 text-white mb-8">
                  <Building className="w-6 h-6" />
                  <span className="text-xl font-bold">CarthaPos</span>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-sm text-white/70 uppercase tracking-wider">{t("auth.welcomeBack")}</p>
                <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                  {t("auth.continueManaging")}
                </h1>
              </div>

              {/* Decorative circles */}
              <div className="absolute top-1/4 right-8 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-1/4 left-8 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            {/* Right Side - Form */}
            <div className="p-16 flex flex-col justify-center">
              <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <LogIn className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-2">{t("auth.welcomeBack")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("auth.loginDescription")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Social Login Options */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => console.log("Google login")}
                  >
                    <Chrome className="w-4 h-4 mr-2" />
                    {t("auth.continueWithGoogle")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => console.log("GitHub login")}
                  >
                    <Github className="w-4 h-4 mr-2" />
                    {t("auth.continueWithGithub")}
                  </Button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t("auth.orContinueWith")}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.yourEmail")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder={t("auth.emailPlaceholderCompany")}
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.passwordPlaceholder")}
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <label
                      htmlFor="remember"
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      {t("auth.rememberMe")}
                    </label>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    {t("auth.forgotPassword")}
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? t("auth.loggingIn") : t("auth.login")}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  {t("auth.dontHaveAccount")}{" "}
                  <Link to="/register" className="text-primary hover:underline font-medium">
                    {t("auth.createAccount")}
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
