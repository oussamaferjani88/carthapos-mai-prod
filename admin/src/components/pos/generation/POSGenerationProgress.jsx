import { useEffect, useState } from 'react';
import { Check, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Generation progress modal.
 *
 * Steps are driven entirely by the caller (`steps` + `activeStepId`) so the
 * list always reflects what actually ran for this build — e.g. the "Écriture
 * USB" step only appears when a USB target was selected. Step status is derived
 * from the active step's position, never accumulated, so skipped steps can't be
 * shown as "Terminé".
 */

const FALLBACK_STEPS = [
  { id: 'validate', label: 'Validation de la configuration', description: 'Vérification des paramètres' },
  { id: 'license', label: 'Génération de la licence', description: 'Création du fichier de licence sécurisé' },
  { id: 'build', label: 'Construction de l\'application', description: 'Assemblage du POS personnalisé' },
  { id: 'finalize', label: 'Finalisation', description: 'Optimisation et préparation du téléchargement' },
];

const clamp = (n) => Math.min(100, Math.max(0, Number.isFinite(n) ? n : 0));

const POSGenerationProgress = ({
  isVisible = false,
  steps = [],
  activeStepId = null,
  progress = 0,
  currentAction = '',
  error = null,
  onComplete = () => {},
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setDisplayProgress(0);
      return undefined;
    }
    const timer = setTimeout(() => setDisplayProgress(clamp(progress)), 80);
    return () => clearTimeout(timer);
  }, [progress, isVisible]);

  useEffect(() => {
    if (isVisible && clamp(progress) >= 100 && !error) onComplete();
  }, [isVisible, progress, error, onComplete]);

  if (!isVisible) return null;

  const activeSteps = steps.length > 0 ? steps : FALLBACK_STEPS;
  const activeIndex = activeSteps.findIndex((step) => step.id === activeStepId);
  const finished = clamp(progress) >= 100 && !error;

  const statusFor = (index) => {
    if (finished) return 'done';
    if (error && index === activeIndex) return 'error';
    if (activeIndex < 0) return 'pending';
    if (index < activeIndex) return 'done';
    if (index === activeIndex) return 'active';
    return 'pending';
  };

  const title = error
    ? 'Génération interrompue'
    : finished
      ? 'POS généré avec succès'
      : 'Génération du POS';
  const HeaderIcon = error ? AlertCircle : finished ? CheckCircle : Loader2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-6">
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg',
              error
                ? 'bg-destructive/10 text-destructive'
                : finished
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-foreground',
            )}
          >
            <HeaderIcon className={cn('size-4', !error && !finished && 'animate-spin')} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {error || currentAction || 'Préparation en cours…'}
            </p>
          </div>
          <span className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
            {Math.round(displayProgress)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-700 ease-out',
                error ? 'bg-destructive' : 'bg-primary',
              )}
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <ol className="px-6 py-5">
          {activeSteps.map((step, index) => {
            const status = statusFor(index);
            const isLast = index === activeSteps.length - 1;

            return (
              <li key={step.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium transition-colors',
                      status === 'done' && 'border-transparent bg-foreground text-background',
                      status === 'active' && 'border-primary bg-background text-primary',
                      status === 'error' && 'border-transparent bg-destructive text-white',
                      status === 'pending' && 'border-border bg-background text-muted-foreground',
                    )}
                  >
                    {status === 'done' && <Check className="size-3" />}
                    {status === 'active' && <Loader2 className="size-3 animate-spin" />}
                    {status === 'error' && <X className="size-3" />}
                    {status === 'pending' && index + 1}
                  </span>
                  {!isLast && (
                    <span
                      className={cn(
                        'my-1 w-px flex-1',
                        status === 'done' ? 'bg-foreground/25' : 'bg-border',
                      )}
                    />
                  )}
                </div>

                <div className={cn('min-w-0 flex-1', !isLast && 'pb-5')}>
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        status === 'pending' ? 'text-muted-foreground' : 'text-foreground',
                      )}
                    >
                      {step.label}
                    </p>
                    {status === 'done' && (
                      <span className="shrink-0 text-xs text-muted-foreground">Terminé</span>
                    )}
                    {status === 'active' && (
                      <span className="shrink-0 text-xs text-primary">En cours…</span>
                    )}
                    {status === 'error' && (
                      <span className="shrink-0 text-xs font-medium text-destructive">Échec</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Footer */}
        <div className="border-t border-border bg-muted/40 px-6 py-3">
          <p className="text-xs text-muted-foreground">
            {error
              ? 'La fenêtre se ferme automatiquement…'
              : finished
                ? 'Ouverture du récapitulatif…'
                : 'La construction peut prendre quelques minutes selon les modules sélectionnés.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default POSGenerationProgress;
