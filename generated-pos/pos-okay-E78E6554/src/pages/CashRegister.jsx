import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { getCurrencySymbol } from '../utils/currency';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import {
  DollarSign, Clock, Play, Square, History, Receipt, Download,
  AlertCircle, CheckCircle, XCircle, FileText, TrendingUp, TrendingDown,
  CreditCard, Smartphone, Coins, Printer
} from 'lucide-react';

export default function CashRegister() {
  const { config: electronConfig } = useAppConfig();
  const getConfig = () => {
    if (electronConfig?.theme) return POSConfiguration.createConfig(electronConfig.theme);
    return POSConfiguration.createConfig({});
  };
  const config = getConfig();

  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [activeTab, setActiveTab] = useState('current');
  const [openFloat, setOpenFloat] = useState('100');
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [shiftDetail, setShiftDetail] = useState(null);
  const [detailDialog, setDetailDialog] = useState(false);

  const denominations = [200, 100, 50, 20, 10, 5, 2, 1, 0.50, 0.20, 0.10, 0.05, 0.02, 0.01];
  const [counts, setCounts] = useState({});
  const [closeNote, setCloseNote] = useState('');

  useEffect(() => { loadActiveShift(); loadShiftHistory(); }, []);

  const loadActiveShift = async () => {
    try {
      if (window.electronAPI?.getActiveShift) {
        const shift = await window.electronAPI.getActiveShift();
        setActiveShift(shift);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadShiftHistory = async () => {
    try {
      if (window.electronAPI?.getShiftHistory) {
        const data = await window.electronAPI.getShiftHistory({});
        setShifts(data);
      } else {
        setShifts([]);
      }
    } catch (e) { console.error(e); }
  };

  const handleOpenShift = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('pos_user') || '{}');
      await window.electronAPI.openShift({
        user_id: user.id || 1,
        user_name: user.full_name || user.username || 'Utilisateur',
        opening_float: parseFloat(openFloat) || 0
      });
      setOpenDialog(false);
      loadActiveShift();
    } catch (e) { console.error(e); alert('Erreur lors de l\'ouverture de la caisse'); }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    let actualTotal = 0;
    const denomCounts = {};
    denominations.forEach(d => {
      const c = parseInt(counts[d] || 0);
      if (c > 0) { actualTotal += d * c; denomCounts[d] = c; }
    });

    const cashSales = activeShift.cash_sales || 0;
    const expectedTotal = (activeShift.opening_float || 0) + cashSales;
    try {
      await window.electronAPI.closeShift({
        shift_id: activeShift.id,
        closing_expected: expectedTotal,
        closing_actual: actualTotal,
        cash_sales: cashSales,
        card_sales: activeShift.card_sales || 0,
        other_sales: 0,
        note: closeNote,
        denominations: denomCounts
      });
      setCloseDialog(false);
      setActiveShift(null);
      setCounts({});
      setCloseNote('');
      loadShiftHistory();
    } catch (e) { console.error(e); alert('Erreur lors de la fermeture'); }
  };

  const openShiftDetail = async (shift) => {
    try {
      if (window.electronAPI?.getShiftDetail) {
        const detail = await window.electronAPI.getShiftDetail(shift.id);
        setShiftDetail(detail);
        setDetailDialog(true);
      }
    } catch (e) { console.error(e); }
  };

  const formatDate = (d) => d ? new Date(d + 'Z').toLocaleString() : '-';
  const formatCurrency = (v) => `${(parseFloat(v) || 0).toFixed(2)} ${getCurrencySymbol(config?.currency || 'TND')}`;

  const getDuration = (opened, closed) => {
    if (!opened) return '-';
    const start = new Date(opened + 'Z');
    const end = closed ? new Date(closed + 'Z') : new Date();
    const diff = Math.floor((end - start) / 60000);
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Caisse enregistreuse</h1>
          <p className="text-muted-foreground">Gestion des shifts et fonds de caisse</p>
        </div>
        {!activeShift && (
          <Button onClick={() => setOpenDialog(true)}>
            <Play className="mr-2 h-4 w-4" />Ouvrir la caisse
          </Button>
        )}
      </div>

      {activeShift ? (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <h3 className="font-bold text-lg">Caisse ouverte</h3>
                  <p className="text-sm text-muted-foreground">
                    Ouverte par {activeShift.user_name || 'Utilisateur'} · {formatDate(activeShift.opened_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Fond de caisse</p>
                  <p className="font-bold">{formatCurrency(activeShift.opening_float)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Durée</p>
                  <p className="font-bold">{getDuration(activeShift.opened_at, null)}</p>
                </div>
                <Button variant="destructive" onClick={() => { setCloseDialog(true); }}>
                  <Square className="mr-2 h-4 w-4" />Fermer la caisse
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <p>Aucune caisse ouverte. Cliquez sur "Ouvrir la caisse" pour commencer.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="border-b">
        <nav className="flex space-x-8">
          <button onClick={() => setActiveTab('current')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'current' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            <Clock className="w-4 h-4 inline mr-2" />Shift en cours
          </button>
          <button onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            <History className="w-4 h-4 inline mr-2" />Historique
          </button>
        </nav>
      </div>

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Historique des shifts</CardTitle>
            <CardDescription>Derniers 100 shifts fermés</CardDescription>
          </CardHeader>
          <CardContent>
            {shifts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucun shift fermé trouvé</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Fond</TableHead>
                    <TableHead>Attendu</TableHead>
                    <TableHead>Réel</TableHead>
                    <TableHead>Différence</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{formatDate(s.opened_at)}</TableCell>
                      <TableCell>{s.user_name || '-'}</TableCell>
                      <TableCell>{getDuration(s.opened_at, s.closed_at)}</TableCell>
                      <TableCell>{formatCurrency(s.opening_float)}</TableCell>
                      <TableCell>{formatCurrency(s.closing_expected)}</TableCell>
                      <TableCell>{formatCurrency(s.closing_actual)}</TableCell>
                      <TableCell>
                        <span className={`font-medium ${parseFloat(s.difference) > 0 ? 'text-green-600' : parseFloat(s.difference) < 0 ? 'text-red-600' : ''}`}>
                          {parseFloat(s.difference) >= 0 ? '+' : ''}{formatCurrency(s.difference)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openShiftDetail(s)}>
                          <FileText className="h-3 w-3 mr-1" />Détail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'current' && activeShift && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium"><DollarSign className="inline h-4 w-4 mr-1" />Ventes espèces</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(activeShift.cash_sales || 0)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium"><CreditCard className="inline h-4 w-4 mr-1" />Ventes carte</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(activeShift.card_sales || 0)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium"><Coins className="inline h-4 w-4 mr-1" />Fond + espèces</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency((activeShift.opening_float || 0) + (activeShift.cash_sales || 0))}</p></CardContent>
          </Card>
        </div>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ouvrir la caisse</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Fond de caisse initial</Label>
              <Input type="number" step="0.01" value={openFloat} onChange={e => setOpenFloat(e.target.value)} autoFocus inputMode="decimal" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Annuler</Button>
            <Button onClick={handleOpenShift}>Ouvrir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Fermeture de la caisse</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <p className="flex justify-between"><span>Fond de caisse:</span><span className="font-medium">{formatCurrency(activeShift?.opening_float)}</span></p>
              <p className="flex justify-between"><span>Ventes espèces:</span><span className="font-medium">{formatCurrency(activeShift?.cash_sales)}</span></p>
              <p className="flex justify-between font-bold border-t pt-1 mt-1"><span>Total attendu:</span><span>{formatCurrency((activeShift?.opening_float || 0) + (activeShift?.cash_sales || 0))}</span></p>
            </div>
            <Label className="text-base font-semibold">Comptage par dénomination</Label>
            <div className="grid grid-cols-2 gap-2">
              {denominations.map(d => (
                <div key={d} className="flex items-center gap-2">
                  <Label className="w-16 text-right text-sm">{d >= 1 ? `${d} ${getCurrencySymbol(config?.currency || 'TND')}` : `${(d * 100).toFixed(0)}c`}</Label>
                  <Input type="number" min="0" placeholder="0" value={counts[d] || ''} onChange={e => setCounts({...counts, [d]: e.target.value})} className="h-8" />
                </div>
              ))}
            </div>
            {Object.entries(counts).filter(([,v]) => parseInt(v) > 0).length > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <p className="flex justify-between"><span>Total compté:</span>
                  <span className="font-bold">{formatCurrency(Object.entries(counts).reduce((s, [d, c]) => s + parseFloat(d) * (parseInt(c) || 0), 0))}</span>
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Note (optionnelle)</Label>
              <Textarea value={closeNote} onChange={e => setCloseNote(e.target.value)} rows={2} placeholder="Raison de la fermeture..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(false)}>Annuler</Button>
            <Button onClick={handleCloseShift}>Fermer la caisse</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Détail du shift</DialogTitle></DialogHeader>
          {shiftDetail && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Utilisateur:</span><span className="font-medium">{shiftDetail.user_name || '-'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ouverture:</span><span>{formatDate(shiftDetail.opened_at)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fermeture:</span><span>{formatDate(shiftDetail.closed_at)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Durée:</span><span>{getDuration(shiftDetail.opened_at, shiftDetail.closed_at)}</span></div>
              </div>
              <div className="border rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Fond de caisse:</span><span>{formatCurrency(shiftDetail.opening_float)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ventes espèces:</span><span>{formatCurrency(shiftDetail.cash_sales)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ventes carte:</span><span>{formatCurrency(shiftDetail.card_sales)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total attendu:</span><span>{formatCurrency(shiftDetail.closing_expected)}</span></div>
                <div className="flex justify-between"><span>Total compté:</span><span>{formatCurrency(shiftDetail.closing_actual)}</span></div>
                <div className={`flex justify-between font-bold ${parseFloat(shiftDetail.difference) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <span>Différence:</span><span>{parseFloat(shiftDetail.difference) >= 0 ? '+' : ''}{formatCurrency(shiftDetail.difference)}</span>
                </div>
              </div>
              {shiftDetail.denomination_breakdown && (
                <div className="border rounded-lg p-4 text-sm">
                  <p className="font-medium mb-2">Comptage détaillé</p>
                  {Object.entries(JSON.parse(shiftDetail.denomination_breakdown)).map(([d, c]) => (
                    <div key={d} className="flex justify-between text-xs">
                      <span>{parseFloat(d) >= 1 ? `${parseFloat(d)} ${getCurrencySymbol(config?.currency || 'TND')}` : `${(parseFloat(d) * 100).toFixed(0)}c`} × {c}</span>
                      <span>{formatCurrency(parseFloat(d) * parseInt(c))}</span>
                    </div>
                  ))}
                </div>
              )}
              {shiftDetail.note && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="text-muted-foreground">Note:</p>
                  <p>{shiftDetail.note}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
