import React, { useState, useEffect } from 'react';
import { Progress } from '../../ui/progress';
import { Card, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Zap,
  Code,
  Settings,
  Download,
  Cpu,
  FileText,
  Rocket,
  Sparkles
} from 'lucide-react';

const POSGenerationProgress = ({ 
  isVisible = false, 
  onComplete = () => {},
  steps = [],
  currentStep = 0,
  progress = 0,
  currentAction = '',
  error = null,
  variant = 'modern' // 'modern', 'elegant', 'futuristic'
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  
  // Animation fluide du pourcentage
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  // Marquer les étapes comme complétées
  useEffect(() => {
    if (currentStep > 0) {
      setCompletedSteps(prev => new Set([...prev, currentStep - 1]));
    }
  }, [currentStep]);

  const defaultSteps = [
    {
      id: 'validation',
      label: 'Validation des paramètres',
      icon: Settings,
      color: 'text-blue-500',
      description: 'Vérification de la configuration'
    },
    {
      id: 'license',
      label: 'Génération de licence',
      icon: FileText,
      color: 'text-green-500',
      description: 'Création du fichier de licence'
    },
    {
      id: 'usb',
      label: 'Écriture USB',
      icon: Download,
      color: 'text-purple-500',
      description: 'Installation sur le support'
    },
    {
      id: 'build',
      label: 'Construction POS',
      icon: Code,
      color: 'text-orange-500',
      description: 'Compilation de l\'application'
    },
    {
      id: 'finalization',
      label: 'Finalisation',
      icon: Rocket,
      color: 'text-pink-500',
      description: 'Optimisation et packaging'
    }
  ];

  const processSteps = steps.length > 0 ? steps : defaultSteps;

  if (!isVisible) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'elegant':
        return {
          container: 'bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-2xl',
          progress: 'bg-gradient-to-r from-slate-600 to-slate-800',
          accent: 'text-slate-600'
        };
      case 'futuristic':
        return {
          container: 'bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 shadow-2xl',
          progress: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500',
          accent: 'text-cyan-600'
        };
      default: // modern
        return {
          container: 'bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 shadow-2xl',
          progress: 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500',
          accent: 'text-blue-600'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <Card className={`w-full max-w-2xl ${styles.container} overflow-hidden`}>
        <CardContent className="p-0">
          {/* Header avec animation */}
          <div className="relative p-8 pb-6 text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 animate-pulse" />
            <div className="relative">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <Sparkles className={`w-8 h-8 ${styles.accent} animate-spin`} />
                  <div className="absolute inset-0 w-8 h-8 rounded-full bg-current opacity-20 animate-ping" />
                </div>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Génération de votre POS
              </h2>
              <p className="text-muted-foreground">
                {error ? 'Une erreur est survenue' : currentAction || 'Préparation en cours...'}
              </p>
            </div>
          </div>

          {/* Barre de progression principale */}
          <div className="px-8 pb-6">
            <div className="relative">
              <Progress 
                value={displayProgress} 
                className="h-3 bg-muted/30 rounded-full overflow-hidden"
              />
              <div 
                className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-700 ease-out ${styles.progress}`}
                style={{ width: `${displayProgress}%` }}
              >
                {/* Effet brillant qui se déplace */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-1/3 animate-shimmer-right" />
              </div>
            </div>
            
            {/* Pourcentage avec animation */}
            <div className="flex justify-between items-center mt-3">
              <span className="text-sm text-muted-foreground">
                Progression
              </span>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="font-mono">
                  {Math.round(displayProgress)}%
                </Badge>
                {error && (
                  <Badge variant="destructive" className="animate-pulse">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Erreur
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Étapes détaillées */}
          <div className="px-8 pb-8">
            <div className="space-y-3">
              {processSteps.map((step, index) => {
                const isCompleted = completedSteps.has(index);
                const isCurrent = index === currentStep;
                const IconComponent = step.icon;

                return (
                  <div 
                    key={step.id}
                    className={`
                      flex items-center space-x-4 p-4 rounded-lg transition-all duration-500
                      ${isCurrent ? 'bg-primary/10 border border-primary/20 shadow-sm' : ''}
                      ${isCompleted ? 'bg-green-50 border border-green-200' : ''}
                      ${!isCurrent && !isCompleted ? 'bg-muted/30' : ''}
                    `}
                  >
                    {/* Icône avec état */}
                    <div className="relative flex-shrink-0">
                      {isCompleted ? (
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center animate-pulse">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                          <IconComponent className={`w-5 h-5 ${step.color}`} />
                        </div>
                      )}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`
                          font-medium transition-colors
                          ${isCurrent ? 'text-primary' : ''}
                          ${isCompleted ? 'text-green-700' : ''}
                        `}>
                          {step.label}
                        </h4>
                        {isCurrent && (
                          <Badge variant="default" className="animate-pulse">
                            <Zap className="w-3 h-3 mr-1" />
                            En cours
                          </Badge>
                        )}
                        {isCompleted && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Terminé
                          </Badge>
                        )}
                      </div>
                      <p className={`
                        text-sm transition-colors
                        ${isCurrent ? 'text-primary/70' : 'text-muted-foreground'}
                      `}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Indicateur de performance */}
          <div className="border-t bg-muted/20 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4" />
                <span>Optimisation automatique</span>
              </div>
              <div className="flex items-center space-x-4">
                <span>Temps estimé: ~30s</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Système opérationnel</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <style jsx="true">{`
        @keyframes shimmer-right {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .animate-shimmer-right {
          animation: shimmer-right 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default POSGenerationProgress;
