import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { statusBadgeClass } from "@/lib/bi-client";

type Props = {
  status: string;
  label?: string;
  className?: string;
};

export function StatusBadge({ status, label, className }: Props) {
  return (
    <Badge variant="outline" className={cn("font-medium", statusBadgeClass(status), className)}>
      {label || status}
    </Badge>
  );
}
