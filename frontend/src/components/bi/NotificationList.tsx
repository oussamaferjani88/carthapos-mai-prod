import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ChevronRight, FileText, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { groupByDay, timeAgo, type BiNotification } from "@/lib/bi-client";
import { BIEmptyState } from "./BIEmptyState";
import { BISkeletonList } from "./BISkeleton";

type Props = {
  notifications: BiNotification[];
  unread: number;
  onMarkAllRead: () => void;
  onOpenNotification: (notification: BiNotification) => void;
  loading?: boolean;
};

export function NotificationList({ notifications, unread, onMarkAllRead, onOpenNotification, loading }: Props) {
  const navigate = useNavigate();

  const handleOpen = (notification: BiNotification) => {
    if (onOpenNotification) {
      onOpenNotification(notification);
      return;
    }
    navigate(
      notification.dashboardId
        ? `/dashboard/bi-dashboard/${notification.dashboardId}`
        : notification.requestId
          ? `/dashboard/bi/requests/${notification.requestId}`
          : "#"
    );
  };

  const grouped = groupByDay(notifications);

  if (loading && notifications.length === 0) {
    return <BISkeletonList count={4} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {notifications.length} notification(s) · {unread} non lue(s)
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={onMarkAllRead} className="gap-2">
            <CheckCheck className="w-3.5 h-3.5" /> Tout marquer comme lu
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <BIEmptyState
          icon={Bell}
          title="Aucune notification"
          description="Vous serez notifié ici dès que l'équipe BI progresse sur vos demandes."
        />
      ) : (
        grouped.map((group) => (
          <div key={group.label}>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground px-1 mb-2">{group.label}</div>
            <Card>
              <CardContent className="p-0">
                {group.items.map((notification, idx) => (
                  <div key={notification.id}>
                    {idx > 0 && <Separator />}
                    <button
                      type="button"
                      className={cn(
                        "w-full text-left p-4 flex items-start gap-3 transition-colors hover:bg-muted/40",
                        !notification.isRead && "bg-primary/[0.03]"
                      )}
                      onClick={() => handleOpen(notification)}
                    >
                      <span
                        aria-hidden
                        className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", notification.isRead ? "bg-muted-foreground/30" : "bg-primary")}
                      />
                      {notification.dashboardId ? (
                        <LayoutDashboard className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{notification.title}</span>
                        <span className="block text-sm text-muted-foreground line-clamp-2">{notification.message}</span>
                        <span className="block text-xs text-muted-foreground/70 mt-0.5">{timeAgo(notification.createdAt)}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 mt-1 text-muted-foreground/60 shrink-0" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ))
      )}
    </div>
  );
}
