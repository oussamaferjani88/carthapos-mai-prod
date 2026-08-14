import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function BIEmptyState({ icon: Icon, title, description, actionLabel, onAction }: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="font-medium text-sm">{title}</p>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
        {actionLabel && onAction && (
          <Button className="mt-5" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
