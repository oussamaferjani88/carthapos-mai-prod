import { useState } from 'react';
import { Settings, Loader2, BarChart3, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import api from '../../lib/api';

function StatItem({ label, value, tone }) {
  return (
    <div className={`p-4 rounded-lg border ${tone}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export default function Step4Preparation({ uploadId, onNext, updateWizardData }) {
  const [preparing, setPreparing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handlePrepare = async () => {
    setPreparing(true);
    setError(null);
    try {
      const res = await api.post(`/bi-uploads/${uploadId}/prepare`);
      const data = res.data?.data || res.data;
      setResult(data);
      setDone(true);
      updateWizardData({ prepared: true, summary: data.statistics || data });
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setPreparing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Étape 4 — Préparation des données</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
          <BarChart3 className="h-8 w-8 text-primary mt-1" />
          <div>
            <p className="text-sm font-medium">Analyse et préparation des données brutes</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les valeurs manquantes, les formats invalides et les valeurs incohérentes sont
              détectés. Les corrections sûres sont appliquées automatiquement ; les problèmes
              nécessitent votre revue avant chargement.
            </p>
          </div>
        </div>

        {!done && !preparing && (
          <Button onClick={handlePrepare} className="w-full">
            <Settings className="h-4 w-4 mr-2" /> Lancer la préparation
          </Button>
        )}

        {preparing && (
          <div className="space-y-2">
            <Progress value={75} className="w-full" />
            <p className="text-sm text-muted-foreground animate-pulse">Préparation en cours...</p>
          </div>
        )}

        {done && result && (
          <div className="space-y-4">
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              result.status === 'READY_FOR_REVIEW'
                ? 'bg-green-50 text-green-700'
                : 'bg-amber-50 text-amber-700'
            }`}>
              {result.status === 'READY_FOR_REVIEW'
                ? <CheckCircle2 className="h-5 w-5" />
                : <AlertTriangle className="h-5 w-5" />}
              <p className="text-sm font-medium">
                {result.status === 'READY_FOR_REVIEW'
                  ? 'Prêt pour revue — aucune erreur bloquante'
                  : 'Revue requise — erreurs à corriger avant chargement'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <StatItem label="Lignes traitées" value={result.statistics?.totalRowsProcessed ?? '-'} tone="bg-muted/40" />
              <StatItem label="Corrections auto" value={result.statistics?.automaticFixes ?? '-'} tone="bg-green-50 text-green-700" />
              <StatItem label="Avertissements" value={result.statistics?.warnings ?? '-'} tone="bg-amber-50 text-amber-700" />
              <StatItem label="Erreurs" value={result.statistics?.errors ?? '-'} tone="bg-red-50 text-red-700" />
              <StatItem label="Doublons retirés" value={result.statistics?.duplicatesRemoved ?? '-'} tone="bg-muted/40" />
            </div>

            {result.unresolvedErrors > 0 && (
              <p className="text-xs text-amber-600">
                {result.unresolvedErrors} erreur(s) nécessitent une décision avant le chargement.
              </p>
            )}

            <Button className="w-full" onClick={onNext}>
              Continuer vers l'aperçu avant / après
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
