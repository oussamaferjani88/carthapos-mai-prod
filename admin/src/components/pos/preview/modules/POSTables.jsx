import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Textarea } from '../../../ui/textarea';
import { Label } from '../../../ui/label';
import { Badge } from '../../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../ui/dialog';
import {
  Plus, Edit, Trash2, Check, Utensils, Clock, Coffee, X, Save,
  Merge, Split, ArrowRightFromLine, UserCircle, FileText, Receipt, GripHorizontal,
  Users, Layers
} from 'lucide-react';

const initialTables = [
  { id: 1, table_number: 'T1', capacity: 4, status: 'available', waiter: '', notes: '', current_order_id: null, x: 10, y: 10, merged_tables: null, merged_into: null },
  { id: 2, table_number: 'T2', capacity: 2, status: 'occupied', waiter: 'Sophie', notes: 'Anniversaire', current_order_id: 123, x: 150, y: 10, merged_tables: null, merged_into: null },
  { id: 3, table_number: 'T3', capacity: 6, status: 'reserved', waiter: 'Marc', notes: '', current_order_id: null, x: 290, y: 10, merged_tables: null, merged_into: null },
  { id: 4, table_number: 'T4', capacity: 4, status: 'cleaning', waiter: '', notes: '', current_order_id: null, x: 10, y: 130, merged_tables: null, merged_into: null },
  { id: 5, table_number: 'T5', capacity: 4, status: 'available', waiter: '', notes: '', current_order_id: null, x: 150, y: 130, merged_tables: null, merged_into: null },
  { id: 6, table_number: 'T6', capacity: 8, status: 'occupied', waiter: 'Lucas', notes: 'Client allergique aux arachides', current_order_id: 456, x: 290, y: 130, merged_tables: null, merged_into: null },
];

export const POSTables = ({ config, setNotification }) => {
  const [tables, setTables] = useState(initialTables.map(t => ({ ...t })));
  const [selectedTable, setSelectedTable] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ table_number: '', capacity: 2, waiter: '', notes: '' });
  const [editingId, setEditingId] = useState(null);

  // Merge / Transfer
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState([]);
  const [transferSource, setTransferSource] = useState(null);
  const [transferMode, setTransferMode] = useState(false);

  // Drag
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const floorRef = useRef(null);

  useEffect(() => { if (!mergeMode) setSelectedForMerge([]); }, [mergeMode]);

  const notify = (msg) => { if (setNotification) setNotification(msg); };

  const openCreate = () => { setEditingId(null); setFormData({ table_number: '', capacity: 2, waiter: '', notes: '' }); setShowAddForm(true); };
  const openEdit = (table) => { setEditingId(table.id); setFormData({ table_number: table.table_number, capacity: table.capacity, waiter: table.waiter || '', notes: table.notes || '' }); setShowAddForm(true); };

  const handleSave = () => {
    if (!formData.table_number.trim()) { alert('Le numéro de table est obligatoire'); return; }
    if (editingId) {
      setTables(prev => prev.map(t => t.id === editingId ? { ...t, ...formData } : t));
      notify(`Table ${formData.table_number} modifiée`);
    } else {
      const newTable = { id: Date.now(), ...formData, status: 'available', current_order_id: null, x: 50, y: 50, merged_tables: null, merged_into: null };
      setTables(prev => [...prev, newTable]);
      notify(`Table ${formData.table_number} créée`);
    }
    setShowAddForm(false);
  };

  const deleteTable = (id) => {
    setTables(prev => prev.filter(t => t.id !== id));
    notify('Table supprimée');
  };

  const updateStatus = (id, status) => {
    setTables(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  // Drag handlers
  const onTableMouseDown = (e, table) => {
    if (mergeMode || transferMode) return;
    e.preventDefault();
    const rect = floorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDraggingId(table.id);
    setDragOffset({ x: e.clientX - rect.left - (table.x || 0), y: e.clientY - rect.top - (table.y || 0) });
  };

  useEffect(() => {
    if (!draggingId) return;
    const move = (e) => {
      const rect = floorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, Math.min(rect.width - 80, e.clientX - rect.left - dragOffset.x));
      const y = Math.max(0, Math.min(rect.height - 80, e.clientY - rect.top - dragOffset.y));
      setTables(prev => prev.map(t => t.id === draggingId ? { ...t, x: Math.round(x), y: Math.round(y) } : t));
    };
    const up = () => setDraggingId(null);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  }, [draggingId, dragOffset]);

  const toggleMergeSelect = (id) => {
    setSelectedForMerge(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const executeMerge = () => {
    if (selectedForMerge.length < 2) { alert('Minimum 2 tables'); return; }
    const primary = tables.find(t => t.id === selectedForMerge[0]);
    const mergedCapacity = tables.filter(t => selectedForMerge.includes(t.id)).reduce((s, t) => s + t.capacity, 0);
    const othersNotes = tables.filter(t => selectedForMerge.includes(t.id) && t.id !== primary.id).filter(o => o.notes).map(o => `Table ${o.table_number}: ${o.notes}`).join('; ');
    setTables(prev => prev.map(t =>
      t.id === primary.id ? { ...t, capacity: mergedCapacity, notes: [t.notes, othersNotes].filter(Boolean).join('; '), merged_tables: selectedForMerge.join(',') }
      : selectedForMerge.includes(t.id) ? { ...t, status: 'merged', merged_into: primary.id, waiter: '', notes: '' } : t
    ));
    notify(`Tables fusionnées: ${selectedForMerge.length} tables`);
    setMergeMode(false);
    setSelectedForMerge([]);
  };

  const executeSplit = (tableId) => {
    const table = tables.find(t => t.id === tableId);
    if (!table?.merged_tables) return;
    const ids = table.merged_tables.split(',').map(Number);
    setTables(prev => prev.map(t =>
      ids.includes(t.id) ? { ...t, status: 'available', merged_into: null } :
      t.id === tableId ? { ...t, capacity: Math.round(table.capacity / ids.length), merged_tables: null, notes: '' } : t
    ));
    notify('Tables séparées');
  };

  const startTransfer = (id) => { setTransferSource(id); setTransferMode(true); };
  const executeTransfer = (targetId) => {
    if (!transferSource || targetId === transferSource) { setTransferMode(false); setTransferSource(null); return; }
    const src = tables.find(t => t.id === transferSource);
    const tgt = tables.find(t => t.id === targetId);
    setTables(prev => prev.map(t => {
      if (t.id === transferSource) return { ...t, status: 'available', current_order_id: null, waiter: '' };
      if (t.id === targetId) return { ...t, status: 'occupied', current_order_id: src.current_order_id, waiter: src.waiter, notes: src.notes };
      return t;
    }));
    notify(`Table ${src.table_number} → ${tgt.table_number}`);
    setTransferMode(false);
    setTransferSource(null);
  };

  const getStatusColor = (s) => {
    switch (s) { case 'available': return 'bg-green-500'; case 'occupied': return 'bg-red-500'; case 'reserved': return 'bg-blue-500'; case 'cleaning': return 'bg-yellow-500'; case 'merged': return 'bg-purple-500'; default: return 'bg-gray-500'; }
  };
  const getStatusLabel = (s) => {
    switch (s) { case 'available': return 'Libre'; case 'occupied': return 'Occupée'; case 'reserved': return 'Réservée'; case 'cleaning': return 'Nettoyage'; case 'merged': return 'Fusionnée'; default: return '?'; }
  };

  const statCards = [
    { label: 'Libres', value: tables.filter(t => t.status === 'available').length, icon: Check, color: 'text-green-500' },
    { label: 'Occupées', value: tables.filter(t => t.status === 'occupied').length, icon: Utensils, color: 'text-red-500' },
    { label: 'Réservées', value: tables.filter(t => t.status === 'reserved').length, icon: Clock, color: 'text-blue-500' },
    { label: 'Nettoyage', value: tables.filter(t => t.status === 'cleaning').length, icon: Coffee, color: 'text-yellow-500' },
    { label: 'Fusionnées', value: tables.filter(t => t.status === 'merged').length, icon: Merge, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-6" style={{ fontFamily: config.fontFamily, fontSize: config.fontSize }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: config.textColor }}>Gestion des tables</h1>
          <p className="text-sm" style={{ color: config.textMutedColor }}>Gérez le plan de salle et les tables</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nouvelle table</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {statCards.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold" style={{ color: config.textColor }}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex gap-2">
        <Button variant={mergeMode ? 'default' : 'outline'} onClick={() => { setMergeMode(!mergeMode); setTransferMode(false); setTransferSource(null); }}>
          <Merge className="mr-2 h-4 w-4" /> {mergeMode ? 'Fusionner' : 'Mode fusion'}
        </Button>
        <Button variant="outline" disabled><Receipt className="mr-2 h-4 w-4" />Diviser l'addition</Button>
      </div>

      {mergeMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-blue-700">{selectedForMerge.length === 0 ? 'Cliquez sur les tables à fusionner' : `${selectedForMerge.length} table(s) sélectionnée(s)`}</span>
          <div className="flex gap-2">
            {selectedForMerge.length >= 2 && <Button size="sm" onClick={executeMerge}><Merge className="mr-1 h-3 w-3" /> Confirmer</Button>}
            <Button size="sm" variant="outline" onClick={() => setMergeMode(false)}><X className="mr-1 h-3 w-3" /> Annuler</Button>
          </div>
        </div>
      )}

      {transferMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-amber-700">Transférer depuis {tables.find(t => t.id === transferSource)?.table_number}</span>
          <Button size="sm" variant="outline" onClick={() => { setTransferMode(false); setTransferSource(null); }}><X className="mr-1 h-3 w-3" /> Annuler</Button>
        </div>
      )}

      {/* Floor Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Plan de salle</CardTitle>
          <CardDescription>Faites glisser les tables. Cliquez pour changer le statut. {mergeMode && 'Sélectionnez des tables à fusionner.'} {transferMode && 'Choisissez la destination.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={floorRef} className="bg-gray-50 rounded-lg p-8 min-h-[350px] border-2 border-dashed border-gray-200 relative overflow-hidden">
            {tables.map((table) => {
              const isSelected = selectedForMerge.includes(table.id);
              const isSource = transferMode && table.id === transferSource;
              return (
                <div key={table.id}
                  className={`absolute flex flex-col items-center justify-center rounded-lg text-white text-xs font-medium cursor-pointer transition-all select-none shadow-md ${draggingId === table.id ? 'scale-110 z-50 shadow-2xl' : 'z-10'} ${isSelected ? 'ring-4 ring-blue-400 scale-110' : ''} ${isSource ? 'ring-2 ring-amber-400' : ''} ${getStatusColor(table.status)} ${table.status === 'merged' ? 'opacity-60' : ''}`}
                  style={{ left: table.x || 0, top: table.y || 0, width: '80px', height: '80px' }}
                  onMouseDown={(e) => onTableMouseDown(e, table)}
                  onClick={() => {
                    if (mergeMode) { toggleMergeSelect(table.id); return; }
                    if (transferMode) { executeTransfer(table.id); return; }
                    if (table.status === 'merged') return;
                    const order = ['available', 'occupied', 'reserved', 'cleaning'];
                    const idx = order.indexOf(table.status);
                    updateStatus(table.id, order[(idx + 1) % 4]);
                  }}
                >
                  <Check className="h-3 w-3 mb-0.5 opacity-70" />
                  <span className="font-bold">{table.table_number}</span>
                  <span className="text-[10px]">{table.capacity}p</span>
                  {table.waiter && <span className="text-[8px] bg-white/20 rounded px-1 mt-0.5 truncate max-w-full">{table.waiter}</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tables List */}
      <Card>
        <CardHeader><CardTitle>Liste des tables</CardTitle><CardDescription>{tables.length} table(s)</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => (
              <Card key={table.id} className={`border ${table.status === 'merged' ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: config.textColor }}>{table.table_number}</h3>
                      <p className="text-sm text-muted-foreground">Capacité: {table.capacity} personnes</p>
                      {table.waiter && <p className="text-xs text-blue-600 mt-1 flex items-center gap-1"><UserCircle className="h-3 w-3" />Serveur: {table.waiter}</p>}
                      {table.notes && <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><FileText className="h-3 w-3" />{table.notes}</p>}
                    </div>
                    <Badge className={getStatusColor(table.status) + ' text-white'}>{getStatusLabel(table.status)}</Badge>
                  </div>
                  {table.current_order_id && <div className="mt-2 p-2 bg-blue-50 rounded text-sm flex items-center gap-1"><Receipt className="h-3 w-3 text-blue-500" /> Commande #{table.current_order_id}</div>}
                  {table.merged_tables && <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-purple-700">Fusionnée avec: {table.merged_tables}</div>}
                  <div className="flex justify-end mt-4 gap-1">
                    <Button variant="outline" size="sm" onClick={() => openEdit(table)}><Edit className="h-3 w-3" /></Button>
                    {table.status !== 'merged' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => updateStatus(table.id, 'available')} disabled={table.status === 'available'}><Check className="h-3 w-3" /></Button>
                        <Button variant="outline" size="sm" onClick={() => updateStatus(table.id, 'occupied')} disabled={table.status === 'occupied'}><Utensils className="h-3 w-3" /></Button>
                        <Button variant="outline" size="sm" onClick={() => updateStatus(table.id, 'cleaning')} disabled={table.status === 'cleaning'}><Coffee className="h-3 w-3" /></Button>
                      </>
                    )}
                    {table.status === 'occupied' && <Button variant="outline" size="sm" onClick={() => startTransfer(table.id)} title="Transférer"><ArrowRightFromLine className="h-3 w-3" /></Button>}
                    {table.merged_tables && <Button variant="outline" size="sm" onClick={() => executeSplit(table.id)} title="Séparer" className="text-purple-600"><Split className="h-3 w-3" /></Button>}
                    <Button variant="outline" size="sm" onClick={() => deleteTable(table.id)} className="text-red-500"><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Modifier la table' : 'Nouvelle table'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2"><Label>Numéro de table</Label><Input value={formData.table_number} onChange={(e) => setFormData({...formData, table_number: e.target.value})} required /></div>
            <div className="grid gap-2"><Label>Capacité</Label><Input type="number" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 2})} min="1" /></div>
            <div className="grid gap-2"><Label>Serveur</Label><Input value={formData.waiter} onChange={(e) => setFormData({...formData, waiter: e.target.value})} placeholder="Nom du serveur" /></div>
            <div className="grid gap-2"><Label>Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} placeholder="Allergies, préférences..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editingId ? 'Modifier' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
