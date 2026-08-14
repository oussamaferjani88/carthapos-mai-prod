import { useState, useEffect } from 'react';
import { Loader2, Table } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import api from '../../lib/api';

export default function Step3RawPreview({ uploadId, onNext }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uploadId) return;
    api.get(`/bi-uploads/${uploadId}/raw-preview`).then((res) => {
      const summary = res.data?.data || res.data;
      const entries = Object.entries(summary.datasets || {}).map(([name, info]) => ({
        name,
        rows: info.rows || 0,
        columns: info.columns || [],
        sample: [],
      }));
      setTables(entries);
      return Promise.all(entries.map((t) =>
        api.get(`/bi-uploads/${uploadId}/raw-preview`, { params: { dataset: t.name, pageSize: 50 } })
          .then((r) => {
            const d = r.data?.data || r.data;
            return { name: t.name, rows: d.totalRows ?? t.rows, columns: d.header || t.columns, sample: d.rows || [] };
          })
          .catch(() => t)
      )).then(setTables);
    }).catch((err) => {
      setError(err.response?.data?.error || err.message);
    }).finally(() => setLoading(false));
  }, [uploadId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Chargement de l'aperçu...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Erreur</CardTitle></CardHeader>
        <CardContent><p className="text-red-600">{error}</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Étape 3 — Aperçu des données brutes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tables.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun jeu de données disponible.</p>
        ) : (
          <Tabs defaultValue={tables[0].name} className="w-full">
            <ScrollArea className="max-w-full">
              <TabsList>
                {tables.map((ds) => (
                  <TabsTrigger key={ds.name} value={ds.name} className="text-xs">
                    <Table className="h-3.5 w-3.5 mr-1" />
                    {ds.name}
                    <Badge variant="secondary" className="ml-1.5 text-[10px]">{ds.rows}</Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>
            {tables.map((ds) => (
              <TabsContent key={ds.name} value={ds.name}>
                <div className="border rounded-lg overflow-hidden">
                  <ScrollArea className="max-h-80">
                    <UITable scrollable={false} className="min-w-max">
                      <TableHeader>
                        <TableRow>
                          {ds.columns?.map((col) => (
                            <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ds.sample?.map((row, i) => (
                          <TableRow key={i}>
                            {ds.columns?.map((col) => (
                              <TableCell key={col} className="text-xs whitespace-nowrap">{row[col] ?? ''}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </UITable>
                  </ScrollArea>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Affichage de {ds.sample?.length || 0} lignes sur {ds.rows}</p>
              </TabsContent>
            ))}
          </Tabs>
        )}

        <Button onClick={onNext} className="w-full">
          Continuer vers la préparation
        </Button>
      </CardContent>
    </Card>
  );
}
