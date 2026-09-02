import { useTranslation } from "react-i18next";
import { ArrowLeft, ExternalLink, AlertCircle, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DEFAULT_ADMIN_URL = "http://localhost:5173";

type PortalUser = {
  id?: string;
  name?: string;
  email?: string;
  companyName?: string;
};

const getPortalUser = (): PortalUser | null => {
  try {
    const local = localStorage.getItem("user");
    if (local) return JSON.parse(local);
  } catch {
    /* ignore */
  }
  try {
    const session = sessionStorage.getItem("user");
    if (session) return JSON.parse(session);
  } catch {
    /* ignore */
  }
  return null;
};

const Generator = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const adminBaseUrl =
    import.meta.env.VITE_ADMIN_APP_URL ||
    import.meta.env.VITE_ADMIN_URL ||
    DEFAULT_ADMIN_URL;

  const sanitizedBase = useMemo(
    () => adminBaseUrl.replace(/\/$/, ""),
    [adminBaseUrl]
  );

  const adminGeneratorUrl = useMemo(() => {
    const userData = user || getPortalUser();
    if (!userData) {
      return `${sanitizedBase}/pos-generator`;
    }

    const params = new URLSearchParams();
    params.set("mode", "user");
    params.set("userId", userData.id || "guest");
    if (userData.name || userData.companyName) {
      params.set("userName", userData.name || userData.companyName);
    }
    if (userData.email) {
      params.set("userEmail", userData.email);
    }
    params.set("source", "client-portal");

    return `${sanitizedBase}/pos-generator?${params.toString()}`;
  }, [sanitizedBase, user]);

  useEffect(() => {
    setUser(getPortalUser());
    checkAdminServer();
  }, []);

  const checkAdminServer = async () => {
    setIsChecking(true);
    try {
      await fetch(sanitizedBase, {
        method: "HEAD",
        mode: "no-cors",
      });
      setIframeError(false);
    } catch (error) {
      setIframeError(true);
    } finally {
      setIsChecking(false);
    }
  };

  const handleRetry = () => {
    setIframeError(false);
    checkAdminServer();
  };

  const openInNewWindow = () => {
    window.open(adminGeneratorUrl, "_blank", "width=1400,height=900");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              {t('dashboard.back')}
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-[22px]">{t('generator.title')}</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">{t('generator.subtitle')}</p>
          </div>
        </div>
        <Button onClick={openInNewWindow} variant="outline" size="sm" className="gap-2">
          <ExternalLink className="w-4 h-4" />
          Open in new window
        </Button>
      </div>

      {/* Content */}
      <div>
        {isChecking ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Connecting to POS Generator...</p>
            </div>
          </div>
        ) : iframeError ? (
          <div className="max-w-4xl mx-auto">
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Générateur POS Non Disponible</AlertTitle>
              <AlertDescription>
                Le générateur dans la partie client n'est pas déployé pour le moment. Vous pouvez le tester dans la partie admin.
              </AlertDescription>
            </Alert>

            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-6">Générateur POS Temporairement Indisponible</h2>
              
              <p className="text-xl text-muted-foreground mb-8">
                Le générateur dans la partie client n'est pas déployé pour le moment. 
                <br />
                Vous pouvez le tester dans la partie admin.
              </p>

              <Button 
                onClick={() => window.open('https://carthapos-admin.onrender.com', '_blank')}
                size="lg"
                className="gap-2"
              >
                <ExternalLink className="w-5 h-5" />
                Ouvrir la Partie Admin
              </Button>
            </div>

            {/* Commented out - Original instructions for local development
            <div className="bg-card border border-border rounded-lg p-8">
              <h2 className="text-2xl font-bold mb-4">How to Start the POS Generator</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Step 1: Open Terminal</h3>
                  <p className="text-muted-foreground mb-2">Open a new terminal window or command prompt</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Step 2: Navigate to Admin Folder</h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    cd d:\pos-system-complete\pos-system\admin
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Step 3: Start Admin Server</h3>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm">
                    npm run dev
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm">
                    The admin server should start on <code className="bg-muted px-1 py-0.5 rounded">http://localhost:5173</code>
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Step 4: Retry Connection</h3>
                  <Button onClick={handleRetry} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Retry Connection
                  </Button>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <h3 className="text-lg font-semibold mb-2">Alternative: Open in New Window</h3>
                <p className="text-muted-foreground mb-4">
                  Once the admin server is running, you can open the POS Generator in a new window:
                </p>
                <Button onClick={openInNewWindow} variant="outline" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Open POS Generator in New Window
                </Button>
              </div>
            </div>
            */}
          </div>
        ) : (
          <div className="h-full">
            <iframe
              src={adminGeneratorUrl}
              className="w-full h-full border-0 rounded-lg"
              style={{ minHeight: 'calc(100vh - 180px)' }}
              title="POS Generator"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
              onError={() => setIframeError(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Generator;
