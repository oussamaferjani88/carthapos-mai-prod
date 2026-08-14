import { Check, CircleAlert } from 'lucide-react';
import { Card, CardContent } from '../../ui/card';
import { cn } from '../../../lib/utils';
import { WORKFLOW_STEPS } from '../../../lib/bi-labels';

export default function RequestWorkflow({ currentStep, isError, hasError, status }) {
  const completed = isError ? 0 : currentStep;
  const isTerminal = status === 'REJECTED' || status === 'CANCELLED';

  return (
    <Card>
      <CardContent className="py-3">
        <ol className="flex items-center">
          {WORKFLOW_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === WORKFLOW_STEPS.length - 1;
            const isDone = !isError && step.step < completed;
            const isCurrent = !isError && step.step === completed;
            const isFailedStep = isError && step.step === currentStep;
            return (
              <li key={step.step} className={cn('flex items-center', !isLast && 'min-w-0 flex-1')}>
                <div
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors',
                    isFailedStep && 'border-red-300 bg-red-50 text-red-700',
                    !isFailedStep && isDone && 'border-transparent bg-green-100 text-green-700',
                    !isFailedStep &&
                      isCurrent &&
                      (hasError
                        ? 'border-amber-300 bg-amber-100 text-amber-700'
                        : 'border-primary/30 bg-primary text-primary-foreground shadow-sm'),
                    !isFailedStep && !isDone && !isCurrent && 'border-border bg-muted text-muted-foreground',
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      'mx-1.5 h-px min-w-2 flex-1',
                      isDone || step.step < completed - 1 ? 'bg-green-300' : 'bg-border',
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>

        {isTerminal ? (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <CircleAlert className="h-4 w-4 shrink-0" />
            La demande a été {status === 'REJECTED' ? 'refusée' : 'annulée'} — le workflow est arrêté.
          </div>
        ) : (
          hasError && (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <CircleAlert className="h-4 w-4 shrink-0" />
              Une étape du traitement a rencontré une erreur — consultez l'historique ci-dessous.
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
