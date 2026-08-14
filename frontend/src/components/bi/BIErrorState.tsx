import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  message?: string;
  onRetry?: () => void;
  className?: string;
};

export function BIErrorState({ message = "Une erreur est survenue. Veuillez réessayer.", onRetry, className }: Props) {
  return (
    <div className={cn("text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-4 flex items-start gap-3", className)} role="alert">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1">
        <div>{message}</div>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Réessayer
          </Button>
        )}
      </div>
    </div>
  );
}
