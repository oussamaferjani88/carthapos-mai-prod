import { useState, useRef, useEffect } from 'react';
import { Upload, File, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import api from '../../lib/api';

export default function Step1Upload({ onComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.get('/bi-uploads/clients/list').then(r => {
      const data = r.data?.data || [];
      setClients(data);
    }).catch(() => {});
  }, []);

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
    if (!file || !clientId || !businessType) {
      setError('Veuillez sélectionner un fichier, un client et un type d\'entreprise');
      return;
    }
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clientId', clientId);
      formData.append('businessType', businessType);
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Client</label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.clientId} value={c.clientId}>
                    {c.name || c.clientId}
                    {c.businessType ? ` (${c.businessType})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Type d'entreprise</label>
            <Select value={businessType} onValueChange={setBusinessType}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un type" /></SelectTrigger>
              <SelectContent>
                {['retail', 'restaurant', 'cafe', 'bakery', 'pharmacy', 'salon', 'hotel', 'clinic'].map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {uploading && <Progress value={progress} className="w-full" />}

        <Button onClick={handleUpload} disabled={uploading || !file || !clientId || !businessType} className="w-full">
          {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Téléversement... {progress}%</> : 'Importer le ZIP'}
        </Button>
      </CardContent>
    </Card>
  );
}
