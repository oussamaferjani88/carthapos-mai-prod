import { useState, useRef, useEffect } from 'react';
import {
  Upload, File, Loader2, Building2, Landmark, Store, UserRound, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import api from '../../lib/api';

export default function Step1Upload({ onComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detected, setDetected] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // When a ZIP is picked, peek its metadata.json to auto-detect the client and
  // business instead of asking the admin to choose manually.
  useEffect(() => {
    if (!file) {
      setDetected(null);
      return;
    }
    let cancelled = false;
    setDetecting(true);
    setError(null);
    setDetected(null);
    const formData = new FormData();
    formData.append('file', file);
    api.post('/bi-uploads/peek-metadata', formData, { headers: { 'Content-Type': null } })
      .then((r) => {
        if (cancelled) return;
        setDetected(r.data?.data || {});
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.error || err.message);
      })
      .finally(() => {
        if (!cancelled) setDetecting(false);
      });
    return () => { cancelled = true; };
  }, [file]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.zip')) setFile(f);
    else setError('Seuls les fichiers .zip sont acceptés');
  };

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file || !detected || !detected.clientId || !detected.businessType) {
      setError('Impossible de détecter le client dans le fichier importé.');
      return;
    }
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', detected.clientId);
      formData.append('businessType', detected.businessType);
      formData.append('businessName', detected.businessName || detected.businessNameResolved || '');
      const res = await api.post('/bi-uploads', formData, {
        headers: { 'Content-Type': null },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 100)),
      });
      const upload = res.data?.upload || res.data?.data;
      setResult(upload);
      onComplete(upload.id);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
  };

  const formatBytes = (b) => {
    if (!b) return '';
    const k = 1024;
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
  };

  if (result) {
    return (
      <Card>
        <CardHeader><CardTitle>Fichier téléversé</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
            <File className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium">{result.fileName}</p>
              <p className="text-sm text-muted-foreground">{formatBytes(result.fileSize)}</p>
            </div>
          </div>
          <p className="text-sm text-green-600">Téléversement réussi. Passage à la validation...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Étape 1 — Importer un ZIP BI</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-1">
            {file ? file.name : 'Glissez-déposez votre fichier .zip ici'}
          </p>
          <p className="text-xs text-muted-foreground">
            {file ? formatBytes(file.size) : 'ou cliquez pour parcourir'}
          </p>
          <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleFileSelect} />
        </div>

        {file && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <File className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Changer</Button>
          </div>
        )}

        {detecting && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyse du fichier pour détecter le client...
          </div>
        )}

        {detected && !detecting && (
          <div className="rounded-lg border p-4 space-y-3 bg-background">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UserRound className="h-4 w-4 text-primary" /> Client détecté automatiquement
              {detected.matched ? (
                <Badge variant="default" className="ml-auto">Client reconnu</Badge>
              ) : (
                <Badge variant="secondary" className="ml-auto">Client non reconnu</Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="text-sm font-medium">{detected.clientName || detected.nameResolved || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Store className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Type d'entreprise</p>
                  <p className="text-sm font-medium">{detected.businessType || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Landmark className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Nom commercial</p>
                  <p className="text-sm font-medium">{detected.businessNameResolved || detected.businessName || '—'}</p>
                </div>
              </div>
            </div>
            {!detected.matched && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Le client ({detected.nameResolved || 'inconnu'}) n'a pas pu être reconnu dans CarthaPOS.
                  Vérifiez que le POS a été généré récemment (avec l'identifiant client) avant d'importer.
                </span>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {uploading && <Progress value={progress} className="w-full" />}

        <Button
          onClick={handleUpload}
          disabled={uploading || !file || detecting || !detected || !detected.clientId}
          className="w-full"
        >
          {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Téléversement... {progress}%</> : 'Importer le ZIP'}
        </Button>
      </CardContent>
    </Card>
  );
}
