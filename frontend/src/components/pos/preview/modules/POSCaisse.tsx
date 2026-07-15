import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../ui/dialog';
import {
  DollarSign, Clock, Play, Square, History, FileText, AlertCircle,
  CreditCard, Coins, TrendingUp, TrendingDown
} from 'lucide-react';

interface ShiftData {
  id: number; user_name: string; opening_float: number; opened_at: string;
  closed_at?: string; status: string; cash_sales: number; card_sales: number;
  closing_expected?: number; closing_actual?: number; difference?: number;
  note?: string; denomination_breakdown?: string;
}

export const POSCaisse = ({ config }: { config: any }) => {
  const [activeTab, setActiveTab] = useState('current');
  const [activeShift, setActiveShift] = useState<ShiftData | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [openFloat, setOpenFloat] = useState('100');
  const [closeNote, setCloseNote] = useState('');
  const [detailDialog, setDetailDialog] = useState(false);
  const [shiftDetail, setShiftDetail] = useState<ShiftData | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});

  const denominations = [200, 100, 50, 20, 10, 5, 2, 1, 0.50, 0.20, 0.10, 0.05, 0.02, 0.01];

  const demoShifts: ShiftData[] = [
    { id: 1, user_name: 'Sophie Martin', opening_float: 100, opened_at: '2025-06-13T07:00:00', closed_at: '2025-06-13T15:30:00', status: 'closed', cash_sales: 845.50, card_sales: 623.20, closing_expected: 945.50, closing_actual: 948.00, difference: 2.50, note: '', denomination_breakdown: '{"100":2,"50":5,"20":12,"10":8,"5":6}' },
    { id: 2, user_name: 'Marc Dubois', opening_float: 100, opened_at: '2025-06-12T07:00:00', closed_at: '2025-06-12T16:00:00', status: 'closed', cash_sales: 920.00, card_sales: 715.80, closing_expected: 1020.00, closing_actual: 1015.50, difference: -4.50, note: 'Rendu monnaie', denomination_breakdown: '{"200":1,"100":2,"50":6,"20":8,"10":5}' },
  ];

  const formatCurrency = (v: any) => (parseFloat(v) || 0).toFixed(2) + '\u20AC';
  const formatDate = (d: string) => d ? new Date(d + 'Z').toLocaleString() : '-';

  const getDuration = (opened: string, closed?: string) => {
    if (!opened) return '-';
    const start = new Date(opened + 'Z');
    const end = closed ? new Date(closed + 'Z') : new Date();
    const diff = Math.floor((end.getTime() - start.getTime()) / 60000);
    return `${Math.floor(diff / 60)}h${(diff % 60).toString().padStart(2, '0')}`;
  };

  const textColor = config.textColor || '#1f2937';
  const mutedColor = config.textMutedColor || '#6b7280';

  const handleOpen = () => {
    setActiveShift({
      id: 99, user_name: 'Démo Frontend', opening_float: parseFloat(openFloat) || 0,
      opened_at: new Date().toISOString(), status: 'open', cash_sales: 0, card_sales: 0
    });
    setOpenDialog(false);
  };

  const handleClose = () => {
    const total = Object.entries(counts).reduce((s, [d, c]) => s + parseFloat(d) * (parseInt(c) || 0), 0);
    setActiveShift(null);
    setCloseDialog(false);
    setCounts({});
    setCloseNote('');
  };

  const openDetail = (shift: ShiftData) => { setShiftDetail(shift); setDetailDialog(true); };

  return (
    <div className="space-y-6" style={{ fontFamily: config.fontFamily, fontSize: config.fontSize }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: textColor }}>Caisse enregistreuse</h1>
          <p className="text-sm" style={{ color: mutedColor }}>Gestion des shifts et fonds de caisse</p>
        </div>
        {!activeShift && (
          <Button onClick={() => setOpenDialog(true)}><Play className="mr-2 h-4 w-4" />Ouvrir la caisse</Button>
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
                    Ouverte par {activeShift.user_name} · {formatDate(activeShift.opened_at)}
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
                  <p className="font-bold">{getDuration(activeShift.opened_at)}</p>
                </div>
                <Button variant="destructive" onClick={() => setCloseDialog(true)}><Square className="mr-2 h-4 w-4" />Fermer</Button>
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
          <CardHeader><CardTitle>Historique des shifts</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    {['Date', 'Utilisateur', 'Durée', 'Fond', 'Attendu', 'Réel', 'Différence', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {demoShifts.map(s => (
                    <tr key={s.id}>
                      <td className="px-4 py-3 text-sm font-medium">{formatDate(s.opened_at)}</td>
                      <td className="px-4 py-3 text-sm">{s.user_name}</td>
                      <td className="px-4 py-3 text-sm">{getDuration(s.opened_at, s.closed_at)}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(s.opening_float)}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(s.closing_expected)}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(s.closing_actual)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-medium ${(s.difference || 0) > 0 ? 'text-green-600' : (s.difference || 0) < 0 ? 'text-red-600' : ''}`}>
                          {(s.difference || 0) >= 0 ? '+' : ''}{formatCurrency(s.difference)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" onClick={() => openDetail(s)}><FileText className="h-3 w-3 mr-1" />Détail</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'current' && activeShift && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm"><DollarSign className="inline h-4 w-4 mr-1" />Ventes espèces</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(activeShift.cash_sales || 0)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm"><CreditCard className="inline h-4 w-4 mr-1" />Ventes carte</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency(activeShift.card_sales || 0)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm"><Coins className="inline h-4 w-4 mr-1" />Fond + espèces</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{formatCurrency((activeShift.opening_float || 0) + (activeShift.cash_sales || 0))}</p></CardContent>
          </Card>
        </div>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ouvrir la caisse</DialogTitle></DialogHeader>
          <div className="space-y-4"><Label>Fond de caisse initial</Label><Input type="number" step="0.01" value={openFloat} onChange={e => setOpenFloat(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Annuler</Button>
            <Button onClick={handleOpen}>Ouvrir</Button>
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
              <p className="flex justify-between font-bold border-t pt-1"><span>Total attendu:</span><span>{formatCurrency((activeShift?.opening_float || 0) + (activeShift?.cash_sales || 0))}</span></p>
            </div>
            <Label className="text-base font-semibold">Comptage par dénomination</Label>
            <div className="grid grid-cols-2 gap-2">
              {denominations.map(d => (
                <div key={d} className="flex items-center gap-2">
                  <Label className="w-16 text-right text-sm">{d >= 1 ? `${d}\u20AC` : `${(d * 100).toFixed(0)}c`}</Label>
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
            <div className="grid gap-2"><Label>Note</Label><Textarea value={closeNote} onChange={e => setCloseNote(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(false)}>Annuler</Button>
            <Button onClick={handleClose}>Fermer la caisse</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Détail du shift</DialogTitle></DialogHeader>
          {shiftDetail && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Utilisateur:</span><span className="font-medium">{shiftDetail.user_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ouverture:</span><span>{formatDate(shiftDetail.opened_at)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fermeture:</span><span>{formatDate(shiftDetail.closed_at || '')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Durée:</span><span>{getDuration(shiftDetail.opened_at, shiftDetail.closed_at)}</span></div>
              </div>
              <div className="border rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Fond de caisse:</span><span>{formatCurrency(shiftDetail.opening_float)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ventes espèces:</span><span>{formatCurrency(shiftDetail.cash_sales)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ventes carte:</span><span>{formatCurrency(shiftDetail.card_sales)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total attendu:</span><span>{formatCurrency(shiftDetail.closing_expected)}</span></div>
                <div className="flex justify-between"><span>Total compté:</span><span>{formatCurrency(shiftDetail.closing_actual)}</span></div>
                <div className={`flex justify-between font-bold ${(shiftDetail.difference || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <span>Différence:</span><span>{(shiftDetail.difference || 0) >= 0 ? '+' : ''}{formatCurrency(shiftDetail.difference)}</span>
                </div>
              </div>
              {shiftDetail.denomination_breakdown && (
                <div className="border rounded-lg p-4 text-sm">
                  <p className="font-medium mb-2">Comptage détaillé</p>
                  {Object.entries(JSON.parse(shiftDetail.denomination_breakdown)).map(([d, c]) => (
                    <div key={d} className="flex justify-between text-xs">
                      <span>{parseFloat(d) >= 1 ? `${parseFloat(d)}\u20AC` : `${(parseFloat(d) * 100).toFixed(0)}c`} × {c}</span>
                      <span>{formatCurrency(parseFloat(d) * parseInt(c as string))}</span>
                    </div>
                  ))}
                </div>
              )}
              {shiftDetail.note && <div className="bg-muted p-3 rounded-lg"><p className="text-xs text-muted-foreground">Note: {shiftDetail.note}</p></div>}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDetailDialog(false)}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSCaisse;
