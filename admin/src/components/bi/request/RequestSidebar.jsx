import { ClipboardList, FileText, Loader2, ShieldCheck, StickyNote } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { Separator } from '../../ui/separator';
import { Textarea } from '../../ui/textarea';
import { cn } from '../../../lib/utils';
import { paymentStatusClass, paymentStatusLabel } from '../../../lib/bi-labels';
import { StatusBadge } from './RequestHeader';

function Section({ title, icon, children }) {
  const Icon = icon;
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export default function RequestSidebar({
  request,
  progress,
  daysElapsed,
  adminNotes,
  onNotesChange,
  onSaveNotes,
  actionLoading,
}) {
  const uploadCount = (request.uploads || []).length;
  const dashCount = (request.dashboards || []).length;

  return (
    <Card className="lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:sticky lg:top-4">
      <CardContent className="space-y-5 p-4 sm:p-5">
        <Section title="Résumé" icon={ClipboardList}>
          <div className="space-y-2.5">
            <Row label="Statut">
              <StatusBadge status={request.status} />
            </Row>
            <Row label="Progression">{progress}%</Row>
            <Row label="Téléversements">{uploadCount}</Row>
            <Row label="Dashboards">{dashCount}</Row>
            <Row label="Jours écoulés">{daysElapsed === null ? '—' : `${daysElapsed} j`}</Row>
          </div>
        </Section>

        <Separator />

        <Section title="Paiement" icon={ShieldCheck}>
          <div className="space-y-2.5">
            <Row label="Statut">
              <Badge className={cn('gap-1', paymentStatusClass(request.paymentStatus))}>
                {paymentStatusLabel(request.paymentStatus)}
              </Badge>
            </Row>
            {request.paymentMethod && <Row label="Méthode">{request.paymentMethod}</Row>}
            {request.paymentNotes && <Row label="Notes">{request.paymentNotes}</Row>}
            {request.paymentRequired && (
              <p className="text-xs text-amber-600">Paiement requis pour cette demande.</p>
            )}
          </div>
        </Section>

        <Separator />

        <Section title="Demande client" icon={FileText}>
          <div className="space-y-3 text-sm">
            {request.message && <p className="text-muted-foreground">{request.message}</p>}
            {Array.isArray(request.objectives) && request.objectives.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Objectifs</p>
                <ul className="list-inside list-disc space-y-0.5">
                  {request.objectives.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(request.kpis) && request.kpis.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">KPI demandés</p>
                <ul className="list-inside list-disc space-y-0.5">
                  {request.kpis.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
            )}
            {request.dashboardRequirements?.trim() && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Exigences</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{request.dashboardRequirements}</p>
              </div>
            )}
          </div>
        </Section>

        <Separator />

        <Section title="Notes admin" icon={StickyNote}>
          <Textarea
            rows={4}
            aria-label="Notes admin"
            value={adminNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Notes internes (non visibles par le client)"
          />
          <Button variant="outline" size="sm" className="mt-2" onClick={onSaveNotes} disabled={!!actionLoading}>
            {actionLoading === 'notes' && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Sauvegarder les notes
          </Button>
        </Section>
      </CardContent>
    </Card>
  );
}
