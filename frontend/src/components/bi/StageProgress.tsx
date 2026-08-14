import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGES, isTerminalStatus } from "@/lib/bi-client";

type Props = {
  currentStep: number;
  status: string;
  className?: string;
  onStepClick?: (stepNumber: number) => void;
  completedSteps?: number;
};

export function StageProgress({ currentStep, status, className, onStepClick, completedSteps }: Props) {
  const terminal = isTerminalStatus(status);
  const stepsDone = completedSteps != null ? completedSteps : currentStep;
  const done = (step: number) => stepsDone > step || (terminal && stepsDone >= step);
  const isCurrent = (step: number) => !terminal && currentStep === step;

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <ol className="flex items-center min-w-[420px] sm:min-w-0" aria-label="Avancement de la demande">
        {STAGES.map((stage, idx) => {
          const stepContent = (
            <div className="flex flex-col items-center gap-1.5">
              <div
                aria-hidden
                className={cn(
                  "w-8 h-8 rounded-full border flex items-center justify-center transition-colors",
                  done(stage.step)
                    ? "bg-green-500/10 border-green-500/50 text-green-600"
                    : isCurrent(stage.step)
                      ? "bg-primary/10 border-primary text-primary"
                      : "border-border text-muted-foreground/60"
                )}
              >
                {done(stage.step) ? (
                  <Check className="w-4 h-4" />
                ) : isCurrent(stage.step) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-xs font-medium">{stage.step}</span>
                )}
              </div>
              <span
                className={cn(
                  "hidden sm:block text-[11px] leading-tight whitespace-nowrap",
                  done(stage.step) ? "text-green-600 font-medium" : isCurrent(stage.step) ? "text-foreground font-medium" : "text-muted-foreground/70"
                )}
              >
                {stage.label}
              </span>
            </div>
          );
          return (
            <li key={stage.step} className={cn("flex items-center", idx < STAGES.length - 1 && "flex-1")}>
              {onStepClick ? (
                <button
                  type="button"
                  aria-label={`Étape ${stage.step} : ${stage.label}`}
                  onClick={() => onStepClick(stage.step)}
                  className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {stepContent}
                </button>
              ) : (
                stepContent
              )}
              {idx < STAGES.length - 1 && (
                <div
                  aria-hidden
                  className={cn("flex-1 h-px mx-2", done(stage.step + 1) ? "bg-green-500/50" : "bg-border")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
