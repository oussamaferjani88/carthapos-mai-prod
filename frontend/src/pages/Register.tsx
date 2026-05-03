import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Lock, Mail, User, Building, Store, Users, Upload, FileText, Phone, MapPin, Hash, ArrowLeft } from "lucide-react";
import LiquidEther from "@/components/LiquidEther";
import AuthSkeleton from "@/components/skeletons/AuthSkeleton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Register = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [accountType, setAccountType] = useState<"normal" | "business" | "reseller">("normal");
  const [referralCode, setReferralCode] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    company: "",
    password: "",
    confirmPassword: "",
    // Business Owner fields
    businessName: "",
    businessType: "",
    businessAddress: "",
    businessPhone: "",
    taxId: "",
    // Reseller fields
    companyName: "",
    registrationNumber: "",
    resellerTaxId: "",
    resellerAddress: "",
    resellerPhone: "",
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocuments(Array.from(e.target.files));
    }
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError(t("auth.passwordMismatch") || "Passwords do not match");
      return false;
    }
    if (formData.password.length < 8) {
      setError(t("auth.passwordLength") || "Password must be at least 8 characters");
      return false;
    }
    if (!acceptTerms) {
      setError(t("auth.acceptTerms") || "You must accept the terms and conditions");
      return false;
    }
    
    // Validate business owner fields
    if (accountType === "business") {
      if (!formData.businessName || !formData.businessType || !formData.businessAddress || !formData.taxId) {
        setError("Please fill all business information fields");
        return false;
      }
      if (documents.length === 0) {
        setError("Please upload your business license (patente)");
        return false;
      }
    }
    
    // Validate reseller fields
    if (accountType === "reseller") {
      if (!formData.companyName || !formData.registrationNumber || !formData.resellerTaxId) {
        setError("Please fill all reseller information fields");
        return false;
      }
      if (documents.length === 0) {
        setError("Please upload your company registration documents");
        return false;
      }
    }
    
    return true;
  };

  // Get gradient colors based on account type
  const getGradientColors = () => {
    switch(accountType) {
      case "normal":
        return "from-blue-400 via-purple-400 to-pink-400"; // Blue/Purple/Pink
      case "business":
        return "from-orange-400 via-amber-400 to-yellow-400"; // Orange/Amber (from screenshot)
      case "reseller":
        return "from-green-400 via-emerald-400 to-teal-400"; // Green/Teal
      default:
        return "from-blue-400 via-purple-400 to-pink-400";
    }
  };

  // Get tagline based on account type
  const getTagline = () => {
    switch(accountType) {
      case "normal":
        return t("auth.taglineNormal");
      case "business":
        return t("auth.taglineBusiness");
      case "reseller":
        return t("auth.taglineReseller");
      default:
        return t("auth.taglineNormal");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // TODO: Replace with actual API call
      const registrationData = {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        accountType,
        referralCode: referralCode || undefined,
        ...(accountType === "business" && {
          businessInfo: {
            name: formData.businessName,
            type: formData.businessType,
            address: formData.businessAddress,
            phone: formData.businessPhone,
            taxId: formData.taxId,
          }
        }),
        ...(accountType === "reseller" && {
          resellerInfo: {
            companyName: formData.companyName,
            registrationNumber: formData.registrationNumber,
            taxId: formData.resellerTaxId,
            address: formData.resellerAddress,
            phone: formData.resellerPhone,
          }
        }),
      };
      
      // TODO: Upload documents if business or reseller
      // const formDataToSend = new FormData();
      // formDataToSend.append('data', JSON.stringify(registrationData));
      // documents.forEach((doc, index) => {
      //   formDataToSend.append(`document${index}`, doc);
      // });
      
      // const response = await fetch('/api/auth/register', {
      //   method: 'POST',
      //   body: formDataToSend,
      // });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log("Registration data:", registrationData);
      console.log("Documents:", documents);
      
      // Normal users go to dashboard, others to pending verification
      if (accountType === "normal") {
        navigate("/dashboard");
      } else {
        navigate("/verification-pending", { state: { accountType } });
      }
    } catch (err) {
      setError(t("auth.registerError") || "Failed to register. Please try again.");
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
          <div className="grid md:grid-cols-[45%_55%] min-h-[800px]">
            {/* Left Side - Dynamic Gradient */}
            <div className={`relative p-12 flex flex-col justify-between bg-gradient-to-br ${getGradientColors()} transition-all duration-700 ease-in-out`}>
              <div>
                <div className="flex items-center gap-2 text-black/80 mb-8">
                  <Building className="w-6 h-6" />
                  <span className="text-xl font-bold">CarthaPos</span>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-sm text-black/70 uppercase tracking-wider">You can easily</p>
                <h1 className="text-4xl md:text-5xl font-bold text-black leading-tight">
                  {getTagline()}
                </h1>
              </div>

              {/* Decorative circles */}
              <div className="absolute top-1/4 right-8 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-1/4 left-8 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            {/* Right Side - Form */}
            <div className="p-16 overflow-y-auto max-h-[800px]">
              <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-2">{t("auth.registerTitle")}</h2>
                <p className="text-sm text-muted-foreground">
                  {t("auth.accountCreation")}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {/* Account Type Selection - Tab Style */}
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 p-1 bg-accent rounded-lg">
                    <button
                      type="button"
                      onClick={() => setAccountType("normal")}
                      className={`py-3 px-4 rounded-md text-sm font-medium transition-all ${
                        accountType === "normal"
                          ? "bg-background shadow-sm"
                          : "hover:bg-background/50"
                      }`}
                    >
                      <User className="w-4 h-4 mx-auto mb-1" />
                      {t("auth.normalUser")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType("business")}
                      className={`py-3 px-4 rounded-md text-sm font-medium transition-all ${
                        accountType === "business"
                          ? "bg-background shadow-sm"
                          : "hover:bg-background/50"
                      }`}
                    >
                      <Store className="w-4 h-4 mx-auto mb-1" />
                      {t("auth.businessOwner")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType("reseller")}
                      className={`py-3 px-4 rounded-md text-sm font-medium transition-all ${
                        accountType === "reseller"
                          ? "bg-background shadow-sm"
                          : "hover:bg-background/50"
                      }`}
                    >
                      <Users className="w-4 h-4 mx-auto mb-1" />
                      {t("auth.reseller")}
                    </button>
                  </div>
                </div>

              {/* Basic Information */}
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder={t("auth.fullNamePlaceholder")}
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Referral Code (Optional for all) */}
              <div className="space-y-2">
                <Label htmlFor="referralCode">{t("auth.referralCode")}</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="referralCode"
                    type="text"
                    placeholder={t("auth.referralCodePlaceholder")}
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t("auth.referralCodeHelp")}</p>
              </div>

              {/* Business Owner Additional Fields */}
              {accountType === "business" && (
                <div className="space-y-4 p-4 border rounded-lg bg-accent/50">
                  <h3 className="font-semibold text-sm">{t("auth.businessInfo")}</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="businessName">{t("auth.businessName")} *</Label>
                    <div className="relative">
                      <Store className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="businessName"
                        name="businessName"
                        type="text"
                        placeholder={t("auth.businessNamePlaceholder")}
                        value={formData.businessName}
                        onChange={handleChange}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessType">{t("auth.businessType")} *</Label>
                    <Select 
                      value={formData.businessType} 
                      onValueChange={(value) => setFormData({...formData, businessType: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("auth.businessTypePlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cafe">{t("auth.cafe")}</SelectItem>
                        <SelectItem value="restaurant">{t("auth.restaurant")}</SelectItem>
                        <SelectItem value="retail">{t("auth.retail")}</SelectItem>
                        <SelectItem value="supermarket">{t("auth.supermarket")}</SelectItem>
                        <SelectItem value="pharmacy">{t("auth.pharmacy")}</SelectItem>
                        <SelectItem value="bakery">{t("auth.bakery")}</SelectItem>
                        <SelectItem value="other">{t("auth.other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessAddress">{t("auth.businessAddress")} *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="businessAddress"
                        name="businessAddress"
                        type="text"
                        placeholder={t("auth.businessAddressPlaceholder")}
                        value={formData.businessAddress}
                        onChange={handleChange}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessPhone">{t("auth.businessPhone")} *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="businessPhone"
                        name="businessPhone"
                        type="tel"
                        placeholder={t("auth.businessPhonePlaceholder")}
                        value={formData.businessPhone}
                        onChange={handleChange}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxId">{t("auth.taxId")} *</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="taxId"
                        name="taxId"
                        type="text"
                        placeholder={t("auth.taxIdPlaceholder")}
                        value={formData.taxId}
                        onChange={handleChange}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessDocuments">{t("auth.businessLicense")} *</Label>
                    <div className="relative">
                      <Upload className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                      <Input
                        id="businessDocuments"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        multiple
                        onChange={handleFileChange}
                        required
                        className="pl-10 cursor-pointer"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{t("auth.businessLicenseHelp")}</p>
                  </div>
                </div>
              )}

              {/* Reseller Additional Fields */}
              {accountType === "reseller" && (
                <div className="space-y-4 p-4 border rounded-lg bg-accent/50">
                  <h3 className="font-semibold text-sm">{t("auth.resellerInfo")}</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyName">{t("auth.companyName")} *</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyName"
                        name="companyName"
                        type="text"
                        placeholder={t("auth.companyNamePlaceholder")}
                        value={formData.companyName}
                        onChange={handleChange}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">{t("auth.registrationNumber")} *</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="registrationNumber"
                        name="registrationNumber"
                        type="text"
                        placeholder={t("auth.registrationNumberPlaceholder")}
                        value={formData.registrationNumber}
                        onChange={handleChange}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resellerTaxId">{t("auth.taxId")} *</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="resellerTaxId"
                        name="resellerTaxId"
                        type="text"
                        placeholder={t("auth.taxIdPlaceholder")}
                        value={formData.resellerTaxId}
                        onChange={handleChange}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resellerAddress">{t("auth.resellerAddress")} *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="resellerAddress"
                        name="resellerAddress"
                        type="text"
                        placeholder={t("auth.resellerAddressPlaceholder")}
                        value={formData.resellerAddress}
                        onChange={handleChange}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resellerPhone">{t("auth.resellerPhone")} *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="resellerPhone"
                        name="resellerPhone"
                        type="tel"
                        placeholder={t("auth.resellerPhonePlaceholder")}
                        value={formData.resellerPhone}
                        onChange={handleChange}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resellerDocuments">{t("auth.resellerDocs")} *</Label>
                    <div className="relative">
                      <Upload className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                      <Input
                        id="resellerDocuments"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        multiple
                        onChange={handleFileChange}
                        required
                        className="pl-10 cursor-pointer"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{t("auth.resellerDocsHelp")}</p>
                  </div>
                </div>
              )}

              {/* Password Fields */}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={t("auth.confirmPasswordPlaceholder")}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Verification Notice for Business/Reseller */}
              {accountType !== "normal" && (
                <Alert>
                  <AlertDescription>
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        {t("auth.verificationNotice")}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t("auth.agreeToTerms")}{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    {t("auth.termsAndConditions")}
                  </Link>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading 
                  ? t("auth.creatingAccount") 
                  : accountType === "normal" 
                    ? t("auth.createAccount") 
                    : t("auth.submitForVerification")
                }
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t("auth.alreadyHaveAccount")}{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  {t("auth.login")}
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

export default Register;
