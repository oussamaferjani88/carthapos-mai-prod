import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  CheckCircle2,
  CircleAlert,
  Database,
  FileArchive,
  FileText,
  LayoutDashboard,
  MessageCircleQuestion,
  Rocket,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_LABELS, timeAgo, type BiRequestEvent } from "@/lib/bi-client";

const EVENT_STYLE: Record<string, { icon: typeof FileText; classes: string }> = {
  REQUEST_CREATED: { icon: FileText, classes: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  ZIP_UPLOADED: { icon: FileArchive, classes: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  ZIP_VALIDATED: { icon: BadgeCheck, classes: "bg-green-500/10 text-green-600 border-green-500/30" },
  ZIP_INVALID: { icon: AlertTriangle, classes: "bg-red-500/10 text-red-600 border-red-500/30" },
  PAYMENT_VERIFIED: { icon: ShieldCheck, classes: "bg-green-500/10 text-green-600 border-green-500/30" },
  PAYMENT_REJECTED: { icon: XCircle, classes: "bg-red-500/10 text-red-600 border-red-500/30" },
  REQUEST_APPROVED: { icon: BadgeCheck, classes: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  REQUEST_REJECTED: { icon: XCircle, classes: "bg-red-500/10 text-red-600 border-red-500/30" },
  REQUEST_INFO_REQUESTED: { icon: MessageCircleQuestion, classes: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  REQUEST_CANCELLED: { icon: Ban, classes: "bg-red-500/10 text-red-600 border-red-500/30" },
  ETL_STARTED: { icon: Database, classes: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  ETL_COMPLETED: { icon: Database, classes: "bg-green-500/10 text-green-600 border-green-500/30" },
  ETL_FAILED: { icon: CircleAlert, classes: "bg-red-500/10 text-red-600 border-red-500/30" },
  DASHBOARD_GENERATED: { icon: LayoutDashboard, classes: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  DASHBOARD_PUBLISHED: { icon: Rocket, classes: "bg-green-500/10 text-green-600 border-green-500/30" },
  REQUEST_COMPLETED: { icon: CheckCircle2, classes: "bg-green-500/10 text-green-600 border-green-500/30" },
};

type Props = {
  events: BiRequestEvent[];
  className?: string;
};

export function BITimeline({ events, className }: Props) {
  if (!events || events.length === 0) return null;

  return (
    <div className={cn("space-y-0", className)} role="list" aria-label="Historique des événements">
      {events.map((event, idx) => {
        const style = EVENT_STYLE[event.type] || { icon: FileText, classes: "bg-primary/10 text-primary border-primary/30" };
        const Icon = style.icon;
        const isLast = idx === events.length - 1;
        const isError = ["ZIP_INVALID", "ETL_FAILED", "REQUEST_REJECTED", "PAYMENT_REJECTED", "REQUEST_CANCELLED"].includes(event.type);
        return (
          <div key={event.id} className="flex gap-3" role="listitem">
            <div className="flex flex-col items-center">
              <div
                aria-hidden
                className={cn("w-8 h-8 rounded-full border flex items-center justify-center shrink-0", style.classes)}
              >
                <Icon className="w-4 h-4" />
              </div>
              {!isLast && <div className={cn("w-px h-6", isError ? "bg-red-500/20" : "bg-border")} />}
            </div>
            <div className={cn("pb-4 text-sm", !isLast && "pt-1")}>
              <div className={cn("font-medium", isError && "text-red-600")}>
                {EVENT_LABELS[event.type] || event.type}
              </div>
              <div className="text-xs text-muted-foreground">
                {timeAgo(event.performedAt)}
                {event.performedByRole
                  ? ` · par ${event.performedByRole === "system" || event.performedByRole === "SYSTEM" ? "système" : event.performedByRole.toLowerCase()}`
                  : ""}
              </div>
              {event.message && <div className="text-xs text-muted-foreground mt-0.5">{event.message}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
