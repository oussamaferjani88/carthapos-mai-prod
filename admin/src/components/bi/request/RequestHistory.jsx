import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { cn } from '../../../lib/utils';
import { fmtDateTime } from '../../../lib/bi-labels';
import { EVENT_ERRORS, EVENT_LABELS, EVENT_STYLE } from './labels';

export default function RequestHistory({ events }) {
  const list = Array.isArray(events) ? events : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Historique de la demande</CardTitle>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun événement.</p>
        ) : (
          <div>
            {list.map((event, idx) => {
              const style = EVENT_STYLE[event.type] || { icon: FileText, classes: 'bg-primary/10 text-primary' };
              const Icon = style.icon;
              const isError = EVENT_ERRORS.includes(event.type);
              const isLast = idx === list.length - 1;
              return (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', style.classes)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {!isLast && <div className={`h-6 w-px ${isError ? 'bg-red-200' : 'bg-border'}`} />}
                  </div>
                  <div className={cn('pb-4 text-sm', !isLast && 'pt-1')}>
                    <div className={cn('font-medium', isError && 'text-red-600')}>
                      {EVENT_LABELS[event.type] || event.type}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDateTime(event.performedAt)}
                      {event.performedByRole
                        ? ` · par ${event.performedByRole === 'system' ? 'système' : event.performedByRole.toLowerCase()}`
                        : ''}
                    </div>
                    {event.message && (
                      <div className="mt-0.5 text-xs text-muted-foreground">{event.message}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
