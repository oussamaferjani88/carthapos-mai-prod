import { useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, FileText, Mail, ArrowLeft } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import LiquidEther from "@/components/LiquidEther";

const VerificationPending = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const accountType = location.state?.accountType || "business";

  useEffect(() => {
    // If no account type in state, redirect to home
    if (!location.state?.accountType) {
      navigate("/");
    }
  }, [location.state, navigate]);

  const accountTypeLabel = accountType === "business" ? "Business Owner" : "Reseller";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Liquid Ether Animation Background */}
      <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, opacity: 0.3 }}>
        <LiquidEther
          colors={theme === "dark" 
            ? ['#0ea5e9', '#22d3ee', '#10b981']
            : ['#ff6b35', '#ff8c42', '#f75347']
          }
          mouseForce={15}
          cursorSize={80}
          isViscous={false}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.3}
          autoIntensity={1.0}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 py-20 flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-2xl backdrop-blur-sm bg-background/95 shadow-2xl">
            <CardHeader className="text-center pb-6">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-yellow-500/10 p-4">
                  <Clock className="w-12 h-12 text-yellow-500" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">
                Verification Pending
              </CardTitle>
              <CardDescription className="text-lg">
                Thank you for registering as a {accountTypeLabel}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Registration Submitted Successfully</AlertTitle>
                <AlertDescription>
                  Your account has been created and is now pending admin verification.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">What happens next?</h3>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="rounded-full bg-primary/10 p-2 flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Document Review</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Our admin team will review your submitted documents and business information.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="rounded-full bg-primary/10 p-2 flex-shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Processing Time</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Verification typically takes 24-48 hours during business days.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    <div className="rounded-full bg-primary/10 p-2 flex-shrink-0">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">Email Notification</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        You'll receive an email once your account is approved or if we need additional information.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-accent/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Important Notes:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Check your email regularly for updates on your verification status</li>
                  <li>Make sure to check your spam folder</li>
                  <li>You will not be able to log in until your account is approved</li>
                  <li>If you have any questions, please contact our support team</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button variant="outline" asChild className="flex-1">
                  <Link to="/">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Return to Home
                  </Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link to="/contact">
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Support
                  </Link>
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                <p>
                  Need immediate assistance?{" "}
                  <a href="mailto:support@carthapos.com" className="text-primary hover:underline">
                    support@carthapos.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VerificationPending;
