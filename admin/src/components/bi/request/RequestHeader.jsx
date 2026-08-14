import { Fragment } from 'react';
import { ArrowLeft, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import { cn } from '../../../lib/utils';
import { fmtDate, statusLabel, statusMeta } from '../../../lib/bi-labels';

export function StatusBadge({ status }) {
  const meta = statusMeta(status);
  const Icon = meta.icon;
  return (
    <Badge className={cn('gap-1', meta.className)}>
      <Icon className="h-3 w-3" />
      {statusLabel(status)}
    </Badge>
  );
}

export default function RequestHeader({ request, info, actions, onRefresh, actionLoading }) {
  const BusinessIcon = info.icon;
  const hasEnabledAction = actions.some((a) => !a.disabled);

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <Link
          to="/bi-requests"
          className="mt-1 text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Retour aux demandes"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className={cn('rounded-xl p-2.5 shrink-0 sm:p-3', info.color)}>
          <BusinessIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight truncate sm:text-2xl">
              {request.businessName || request.businessType}
            </h1>
            <StatusBadge status={request.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {info.label}
            <span className="mx-1.5 text-muted-foreground/40">·</span>
            {request.dashboardTemplate || request.dashboardType || 'Dashboard personnalisé'}
            <span className="mx-1.5 text-muted-foreground/40">·</span>
            Créée le {fmtDate(request.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Actualiser
        </Button>
        {hasEnabledAction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {actionLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {actions.map((a, idx) =>
                a.destructive ? (
                  <Fragment key={a.key}>
                    {idx > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      disabled={a.disabled || !!actionLoading}
                      onSelect={a.onClick}
                    >
                      <a.icon className="h-4 w-4" />
                      {a.label}
                    </DropdownMenuItem>
                  </Fragment>
                ) : a.link && !a.disabled ? (
                  <DropdownMenuItem asChild key={a.key}>
                    <Link to={a.link}>
                      <a.icon className="h-4 w-4" />
                      {a.label}
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem key={a.key} disabled={a.disabled || !!actionLoading} onSelect={a.onClick}>
                    {actionLoading === a.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <a.icon className="h-4 w-4" />
                    )}
                    {a.label}
                  </DropdownMenuItem>
                ),
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
