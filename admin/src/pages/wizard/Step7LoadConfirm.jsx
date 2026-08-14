import { useState } from 'react';
import { Database, Loader2, AlertTriangle, CheckCircle2, LayoutDashboard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { ScrollArea } from '../../components/ui/scroll-area';
import api from '../../lib/api';

export default function Step7LoadConfirm({ uploadId, onNext, onBack, updateWizardData, nextLabel = 'Choisir un tableau de bord' }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [gate, setGate] = useState(null);
  const [result, setResult] = useState(null);

  const handleLoad = async () => {
    setLoading(true);
    setError(null);
    setGate(null);
    try {
      const res = await api.post(`/bi-uploads/${uploadId}/confirm-load`);
      const data = res.data?.data || res.data;
      setResult(data);
      setDone(true);
      updateWizardData({ loaded: true, loadResult: data });
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      const unresolved = err.response?.data?.unresolvedErrors;
      if (unresolved) {
        setGate(unresolved);
        setError(msg);
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Étape 7 — Chargement dans l'entrepôt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Action irréversible</p>
            <p className="text-xs text-amber-700 mt-1">
              Les données validées et préparées seront chargées dans l'entrepôt de données BI.
              Cette action remplacera les données existantes pour ce client.
            </p>
          </div>
        </div>

        {gate && (
          <div className="space-y-3 p-4 border border-red-200 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-sm font-medium text-red-700">Des erreurs de données bloquent le chargement</p>
            </div>
            <p className="text-xs text-red-600">
              {gate.length} erreur(s) non résolue(s) empêchent le chargement. Revenez en arrière pour
              examiner les données ou corrigez le fichier source.
            </p>
            <ScrollArea className="max-h-40">
              <ul className="text-xs text-red-700 space-y-1">
                {gate.slice(0, 20).map((c, i) => (
                  <li key={i}>{c.dataset}[{c.rowIndex}].{c.column} — {c.reason}</li>
                ))}
                {gate.length > 20 && <li>… et {gate.length - 20} autre(s)</li>}
              </ul>
            </ScrollArea>
            <Button variant="outline" className="w-full" onClick={onBack}>
              Retour
            </Button>
          </div>
        )}

        {!loading && !done && !gate && (
          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleLoad}>
              <Database className="h-4 w-4 mr-2" /> Confirmer le chargement
            </Button>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            <Progress value={50} className="w-full" />
            <p className="text-sm text-muted-foreground animate-pulse">Chargement en cours...</p>
          </div>
        )}

        {done && (
          <div className="space-y-3">
            <div className="p-4 bg-green-50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-700">Les données du client sont prêtes.</p>
              </div>
              {result?.recordsLoaded && (
                <p className="text-xs text-green-600">{result.recordsLoaded} enregistrements chargés dans l'entrepôt</p>
              )}
              {result?.elapsed && (
                <p className="text-xs text-green-600">en {result.elapsed}s</p>
              )}
            </div>
            <Button className="w-full" onClick={onNext}>
              <LayoutDashboard className="h-4 w-4 mr-2" /> {nextLabel}
            </Button>
          </div>
        )}

        {error && !gate && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
