import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Download, Home } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import api from '../../lib/api';

export default function Step9Success({ uploadId, onFinish }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uploadId) return;
    api.get(`/bi-uploads/${uploadId}/report`).then((res) => {
      setReport(res.data?.data || res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [uploadId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Génération du rapport...</span>
        </CardContent>
      </Card>
    );
  }

  const rowsProcessed = report?.recordsLoaded || report?.totalRows || 0;
  const importDuration = report?.elapsed ?? 'N/A';
  const status = report?.status || 'COMPLETED';

  return (
    <Card>
      <CardContent className="space-y-6 py-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold">Import terminé avec succès !</h2>
          <p className="text-sm text-muted-foreground">
            Les données BI ont été importées et sont disponibles pour l'analyse.
          </p>
        </div>

        {report && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{report.fileName || '—'}</p>
              <p className="text-xs text-muted-foreground">Fichier source</p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{rowsProcessed.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Lignes chargées</p>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{importDuration}{typeof importDuration === 'number' ? 's' : ''}</p>
              <p className="text-xs text-muted-foreground">Durée</p>
            </div>
          </div>
        )}

        {report?.status && (
          <div className="text-center">
            <Badge variant={status === 'COMPLETED' ? 'default' : 'secondary'}>{status}</Badge>
          </div>
        )}

        {report?.dashboard && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
            <span className="text-muted-foreground">Tableau de bord sélectionné :</span>
            <span className="font-medium">{report.dashboard.name}</span>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button variant="outline" className="flex-1">
            <Download className="h-4 w-4 mr-2" /> Télécharger le rapport
          </Button>
          <Button className="flex-1" onClick={onFinish}>
            <Home className="h-4 w-4 mr-2" /> Retour aux imports
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
