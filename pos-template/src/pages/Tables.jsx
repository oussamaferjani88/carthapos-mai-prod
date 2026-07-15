import { useState, useEffect, useRef } from 'react';
import { 
  Plus, Users, Clock, Check, X, Edit2, Trash2, Coffee, Utensils, ListIcon, Layers,
  GripHorizontal, Merge, Split, ArrowRightFromLine, Receipt, UserCircle, FileText,
  Move, DollarSign
} from 'lucide-react';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function Tables() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [formData, setFormData] = useState({
    table_number: '', capacity: 2, waiter: '', notes: ''
  });
  const [bulkFormData, setBulkFormData] = useState({
    prefix: 'T', start: 1, end: 10, capacity: 4
  });

  // Merge mode
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState([]);
  const [transferMode, setTransferMode] = useState(false);
  const [transferSource, setTransferSource] = useState(null);
  const [splitBillMode, setSplitBillMode] = useState(false);
  const [splitTableId, setSplitTableId] = useState(null);

  // Drag state
  const [draggingTable, setDraggingTable] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const floorRef = useRef(null);

  const { config: electronConfig } = useAppConfig();
  const getConfig = () => {
    if (electronConfig?.theme) {
      return POSConfiguration.createConfig(electronConfig.theme);
    }
    return POSConfiguration.createConfig({
      primaryColor: '#3b82f6', backgroundColor: '#ffffff', textColor: '#1f2937'
    });
  };
  const config = getConfig();

  useEffect(() => { loadTables(); }, []);

  useEffect(() => {
    if (!mergeMode) setSelectedForMerge([]);
  }, [mergeMode]);

  const loadTables = async () => {
    try {
      setLoading(true);
      if (window.electronAPI) {
        const t = await window.electronAPI.getTables();
        setTables(t);
      } else {
        setTables([
          { id: 1, table_number: 'T1', capacity: 4, status: 'available', current_order_id: null, waiter: '', notes: '', x: 10, y: 10 },
          { id: 2, table_number: 'T2', capacity: 2, status: 'occupied', current_order_id: 123, waiter: 'Sophie', notes: 'Anniversaire', x: 150, y: 10 },
          { id: 3, table_number: 'T3', capacity: 6, status: 'reserved', current_order_id: null, waiter: 'Marc', notes: '', x: 290, y: 10 },
          { id: 4, table_number: 'T4', capacity: 4, status: 'cleaning', current_order_id: null, waiter: '', notes: '', x: 10, y: 130 },
          { id: 5, table_number: 'T5', capacity: 4, status: 'available', current_order_id: null, waiter: '', notes: '', x: 150, y: 130 },
          { id: 6, table_number: 'T6', capacity: 8, status: 'occupied', current_order_id: 456, waiter: 'Lucas', notes: 'Client allergique aux arachides', x: 290, y: 130 },
        ]);
      }
    } catch (error) { console.error('Error loading tables:', error);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.table_number.trim()) { alert('Le numéro de table est obligatoire'); return; }
    try {
      if (editingTable) {
        if (window.electronAPI) await window.electronAPI.updateTable(editingTable.id, formData);
        else setTables(prev => prev.map(t => t.id === editingTable.id ? { ...t, ...formData } : t));
      } else {
        if (window.electronAPI) await window.electronAPI.addTable(formData);
        else {
          const existingPositions = tables.map(t => ({ x: t.x || 0, y: t.y || 0 }));
          let newX = 50, newY = 50;
          for (let attempt = 0; attempt < 100; attempt++) {
            const candidateX = 50 + (attempt % 10) * 90;
            const candidateY = 50 + Math.floor(attempt / 10) * 90;
            const overlaps = existingPositions.some(p =>
              Math.abs(p.x - candidateX) < 80 && Math.abs(p.y - candidateY) < 80
            );
            if (!overlaps) { newX = candidateX; newY = candidateY; break; }
          }
          const newTable = { id: Date.now(), ...formData, status: 'available', current_order_id: null, x: newX, y: newY };
          setTables(prev => [...prev, newTable]);
        }
      }
      setDialogOpen(false); setEditingTable(null);
      setFormData({ table_number: '', capacity: 2, waiter: '', notes: '' });
      if (window.electronAPI) loadTables();
    } catch (error) { console.error('Error saving table:', error); alert('Erreur lors de la sauvegarde'); }
  };

  const openCreateDialog = () => {
    setEditingTable(null);
    setFormData({ table_number: '', capacity: 2, waiter: '', notes: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (table) => {
    setEditingTable(table);
    setFormData({ table_number: table.table_number, capacity: table.capacity, waiter: table.waiter || '', notes: table.notes || '' });
    setDialogOpen(true);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    const { prefix, start, end, capacity } = bulkFormData;
    if (start > end) { alert('Le numéro de début doit être inférieur ou égal au numéro de fin'); return; }
    const count = end - start + 1;
    if (count > 50) { alert('Maximum 50 tables par ajout en bulk'); return; }
    try {
      if (window.electronAPI) {
        for (let i = start; i <= end; i++) {
          await window.electronAPI.addTable({ table_number: `${prefix}${i}`, capacity });
        }
      } else {
        const newTables = Array.from({ length: count }, (_, i) => ({
          id: Date.now() + i, table_number: `${prefix}${start + i}`, capacity,
          status: 'available', current_order_id: null, waiter: '', notes: '', x: 50 + (i * 80), y: 50
        }));
        setTables(prev => [...prev, ...newTables]);
      }
      setBulkDialogOpen(false);
      setBulkFormData({ prefix: 'T', start: 1, end: 10, capacity: 4 });
      if (window.electronAPI) loadTables();
    } catch (error) { console.error('Error bulk adding tables:', error); alert('Erreur'); }
  };

  const getBulkPreview = () => {
    const { prefix, start, end } = bulkFormData;
    if (start > end) return [];
    return Array.from({ length: Math.min(end - start + 1, 20) }, (_, i) => `${prefix}${start + i}`);
  };

  const updateTableStatus = async (tableId, newStatus) => {
    try {
      if (window.electronAPI) await window.electronAPI.updateTableStatus(tableId, newStatus);
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: newStatus } : t));
    } catch (error) { console.error('Error updating table status:', error); alert('Erreur'); }
  };

  const updateTablePosition = async (tableId, x, y) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, x, y } : t));
    if (window.electronAPI) {
      try { await window.electronAPI.updateTable(tableId, { x, y }); }
      catch (e) { console.error('Error saving position:', e); }
    }
  };

  // Drag handlers
  const handleTableMouseDown = (e, table) => {
    if (mergeMode || transferMode || splitBillMode) return;
    e.preventDefault();
    const floorRect = floorRef.current?.getBoundingClientRect();
    if (!floorRect) return;
    setDraggingTable(table.id);
    setDragOffset({
      x: e.clientX - floorRect.left - (table.x || 0),
      y: e.clientY - floorRect.top - (table.y || 0)
    });
  };

  useEffect(() => {
    if (!draggingTable) return;
    const handleMouseMove = (e) => {
      const floorRect = floorRef.current?.getBoundingClientRect();
      if (!floorRect) return;
      const x = Math.max(0, Math.min(floorRect.width - 80, e.clientX - floorRect.left - dragOffset.x));
      const y = Math.max(0, Math.min(floorRect.height - 80, e.clientY - floorRect.top - dragOffset.y));
      setTables(prev => prev.map(t => t.id === draggingTable ? { ...t, x: Math.round(x), y: Math.round(y) } : t));
    };
    const handleMouseUp = () => {
      if (draggingTable) {
        const table = tables.find(t => t.id === draggingTable);
        if (table) updateTablePosition(table.id, table.x, table.y);
      }
      setDraggingTable(null);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTable, dragOffset]);

  // Merge handlers
  const toggleMergeSelect = (tableId) => {
    setSelectedForMerge(prev =>
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    );
  };

  const executeMerge = async () => {
    if (selectedForMerge.length < 2) { alert('Sélectionnez au moins 2 tables'); return; }
    const primary = tables.find(t => t.id === selectedForMerge[0]);
    const others = tables.filter(t => selectedForMerge.includes(t.id) && t.id !== primary.id);
    const mergedCapacity = tables.filter(t => selectedForMerge.includes(t.id)).reduce((sum, t) => sum + t.capacity, 0);
    const mergedNotes = others.filter(o => o.notes).map(o => `Table ${o.table_number}: ${o.notes}`).join('; ');
    try {
      if (window.electronAPI) {
        await window.electronAPI.updateTable(primary.id, {
          capacity: mergedCapacity,
          notes: [primary.notes, mergedNotes].filter(Boolean).join('; '),
          merged_tables: selectedForMerge.join(',')
        });
        for (const t of others) {
          await window.electronAPI.updateTable(t.id, { status: 'merged', merged_into: primary.id });
        }
      }
      setTables(prev => prev.map(t =>
        t.id === primary.id ? { ...t, capacity: mergedCapacity, notes: [t.notes, mergedNotes].filter(Boolean).join('; '), merged_tables: selectedForMerge.join(',') }
        : selectedForMerge.includes(t.id) ? { ...t, status: 'merged', merged_into: primary.id } : t
      ));
    } catch (error) {
      console.error('Error merging tables:', error);
      alert('Erreur lors de la fusion');
    }
    setMergeMode(false);
    setSelectedForMerge([]);
  };

  const executeSplit = async (tableId) => {
    const table = tables.find(t => t.id === tableId);
    if (!table || !table.merged_tables) return;
    const ids = table.merged_tables.split(',').map(Number);
    try {
      if (window.electronAPI) {
        for (const id of ids) {
          await window.electronAPI.updateTable(id, { status: 'available', merged_into: null });
        }
        await window.electronAPI.updateTable(tableId, {
          capacity: Math.round(table.capacity / ids.length),
          merged_tables: null,
          notes: ''
        });
      }
      setTables(prev => prev.map(t =>
        ids.includes(t.id) ? { ...t, status: 'available', merged_into: null } :
        t.id === tableId ? { ...t, capacity: Math.round(table.capacity / ids.length), merged_tables: null, notes: '' } : t
      ));
    } catch (error) {
      console.error('Error splitting table:', error);
      alert('Erreur lors de la séparation');
    }
  };

  // Transfer handler
  const startTransfer = (tableId) => {
    setTransferSource(tableId);
    setTransferMode(true);
  };

  const executeTransfer = async (targetId) => {
    if (!transferSource || targetId === transferSource) { setTransferMode(false); return; }
    const source = tables.find(t => t.id === transferSource);
    const target = tables.find(t => t.id === targetId);
    if (!source || !target) return;
    try {
      if (window.electronAPI) {
        await window.electronAPI.updateTable(transferSource, { status: 'available', current_order_id: null, waiter: '' });
        await window.electronAPI.updateTable(targetId, { status: 'occupied', current_order_id: source.current_order_id, waiter: source.waiter, notes: source.notes });
      }
      setTables(prev => prev.map(t => {
        if (t.id === transferSource) return { ...t, status: 'available', current_order_id: null, waiter: '' };
        if (t.id === targetId) return { ...t, status: 'occupied', current_order_id: source.current_order_id, waiter: source.waiter, notes: source.notes };
        return t;
      }));
    } catch (error) {
      console.error('Error transferring table:', error);
      alert('Erreur lors du transfert');
    }
    setTransferMode(false);
    setTransferSource(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-500 hover:bg-green-600';
      case 'occupied': return 'bg-red-500 hover:bg-red-600';
      case 'reserved': return 'bg-blue-500 hover:bg-blue-600';
      case 'cleaning': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'merged': return 'bg-purple-500 hover:bg-purple-600';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'available': return 'Libre';
      case 'occupied': return 'Occupée';
      case 'reserved': return 'Réservée';
      case 'cleaning': return 'Nettoyage';
      case 'merged': return 'Fusionnée';
      default: return 'Inconnue';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available': return <Check className="h-4 w-4" />;
      case 'occupied': return <Utensils className="h-4 w-4" />;
      case 'reserved': return <Clock className="h-4 w-4" />;
      case 'cleaning': return <Coffee className="h-4 w-4" />;
      case 'merged': return <Merge className="h-4 w-4" />;
      default: return <X className="h-4 w-4" />;
    }
  };

  const statusStats = {
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    cleaning: tables.filter(t => t.status === 'cleaning').length,
    merged: tables.filter(t => t.status === 'merged').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des tables</h1>
          <p className="text-muted-foreground">Gérez le plan de salle et l'état des tables</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
            <Layers className="mr-2 h-4 w-4" /> Ajout en bulk
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle table
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-6"><div className="flex items-center"><Check className="h-4 w-4 text-green-500" /><div className="ml-2"><p className="text-sm font-medium text-muted-foreground">Libres</p><p className="text-2xl font-bold">{statusStats.available}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center"><Utensils className="h-4 w-4 text-red-500" /><div className="ml-2"><p className="text-sm font-medium text-muted-foreground">Occupées</p><p className="text-2xl font-bold">{statusStats.occupied}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center"><Clock className="h-4 w-4 text-blue-500" /><div className="ml-2"><p className="text-sm font-medium text-muted-foreground">Réservées</p><p className="text-2xl font-bold">{statusStats.reserved}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center"><Coffee className="h-4 w-4 text-yellow-500" /><div className="ml-2"><p className="text-sm font-medium text-muted-foreground">Nettoyage</p><p className="text-2xl font-bold">{statusStats.cleaning}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center"><Merge className="h-4 w-4 text-purple-500" /><div className="ml-2"><p className="text-sm font-medium text-muted-foreground">Fusionnées</p><p className="text-2xl font-bold">{statusStats.merged}</p></div></div></CardContent></Card>
      </div>

      {/* Action Bar */}
      <div className="flex gap-2">
        <Button variant={mergeMode ? 'default' : 'outline'} onClick={() => { setMergeMode(!mergeMode); setTransferMode(false); setSplitBillMode(false); }}>
          <Merge className="mr-2 h-4 w-4" /> {mergeMode ? 'Fusionner' : 'Mode fusion'}
        </Button>
        <Button variant="outline" disabled={!tables.some(t => t.status === 'occupied')}>
          <Receipt className="mr-2 h-4 w-4" /> Diviser l'addition
        </Button>
      </div>

      {mergeMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-blue-700">
            {selectedForMerge.length === 0 ? 'Cliquez sur les tables à fusionner (minimum 2)' :
             `${selectedForMerge.length} table(s) sélectionnée(s)`}
          </p>
          <div className="flex gap-2">
            {selectedForMerge.length >= 2 && (
              <Button size="sm" onClick={executeMerge}>
                <Merge className="mr-1 h-3 w-3" /> Confirmer la fusion
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setMergeMode(false)}>
              <X className="mr-1 h-3 w-3" /> Annuler
            </Button>
          </div>
        </div>
      )}

      {transferMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-amber-700">
            Transférer depuis {tables.find(t => t.id === transferSource)?.table_number} — Cliquez sur la table de destination
          </p>
          <Button size="sm" variant="outline" onClick={() => { setTransferMode(false); setTransferSource(null); }}>
            <X className="mr-1 h-3 w-3" /> Annuler
          </Button>
        </div>
      )}

      {/* Floor Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Plan de salle</CardTitle>
          <CardDescription>
            {mergeMode ? 'Sélectionnez les tables à fusionner' :
             transferMode ? 'Choisissez la table de destination' :
             'Faites glisser les tables pour les positionner. Cliquez pour changer le statut.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={floorRef}
            className="bg-gray-50 rounded-lg p-8 min-h-[400px] border-2 border-dashed border-gray-200 relative overflow-hidden"
          >
            {tables.length === 0 ? (
              <div className="flex items-center justify-center text-gray-500 h-full">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Aucune table configurée</p>
                  <p className="text-sm">Ajoutez votre première table pour commencer</p>
                </div>
              </div>
            ) : (
              tables.map((table) => {
                const isSelected = selectedForMerge.includes(table.id);
                const isMergeTarget = mergeMode;
                const isTransferTarget = transferMode && table.id !== transferSource && table.status === 'available';
                const isSource = transferMode && table.id === transferSource;
                return (
                  <div
                    key={table.id}
                    className={`absolute flex flex-col items-center justify-center rounded-lg text-white text-xs font-medium cursor-pointer transition-all select-none ${
                      draggingTable === table.id ? 'shadow-2xl scale-110 z-50' : 'shadow-md z-10'
                    } ${isSelected ? 'ring-4 ring-blue-400 scale-110 z-20' : ''} ${
                      isMergeTarget && !isSelected ? 'ring-2 ring-blue-200 ring-dashed' : ''
                    } ${getStatusColor(table.status)} ${table.status === 'merged' ? 'opacity-60' : ''}`}
                    style={{
                      left: `${table.x || 0}px`, top: `${table.y || 0}px`,
                      width: '80px', height: '80px'
                    }}
                    onMouseDown={(e) => handleTableMouseDown(e, table)}
                    onClick={() => {
                      if (mergeMode) { toggleMergeSelect(table.id); return; }
                      if (transferMode) { executeTransfer(table.id); return; }
                      if (table.status === 'merged') return;
                      const statuses = ['available', 'occupied', 'reserved', 'cleaning'];
                      const currentIndex = statuses.indexOf(table.status);
                      const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                      updateTableStatus(table.id, nextStatus);
                    }}
                  >
                    <div className="flex items-center mb-0.5">
                      {getStatusIcon(table.status)}
                    </div>
                    <div className="font-bold text-sm">{table.table_number}</div>
                    <div className="flex items-center text-[10px]">
                      <Users className="h-2.5 w-2.5 mr-0.5" /> {table.capacity}
                    </div>
                    {table.waiter && (
                      <div className="text-[8px] bg-white/20 rounded px-1 mt-0.5 truncate max-w-full">
                        {table.waiter}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tables List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des tables</CardTitle>
          <CardDescription>{tables.length} table(s) configurée(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => (
              <Card key={table.id} className={`border ${table.status === 'merged' ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg">{table.table_number}</h3>
                      <p className="text-sm text-muted-foreground">Capacité: {table.capacity} personnes</p>
                      {table.waiter && (
                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <UserCircle className="h-3 w-3" /> Serveur: {table.waiter}
                        </p>
                      )}
                      {table.notes && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {table.notes}
                        </p>
                      )}
                    </div>
                    <Badge className={getStatusColor(table.status) + ' text-white'}>
                      {getStatusLabel(table.status)}
                    </Badge>
                  </div>

                  {table.current_order_id && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm flex items-center gap-1">
                      <Receipt className="h-3 w-3 text-blue-500" />
                      Commande: #{table.current_order_id}
                    </div>
                  )}

                  {table.merged_tables && (
                    <div className="mt-2 p-2 bg-purple-50 rounded text-xs text-purple-700">
                      Fusionnée avec: {table.merged_tables}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-4">
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(table)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      {table.status !== 'merged' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => updateTableStatus(table.id, 'available')} disabled={table.status === 'available'}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => updateTableStatus(table.id, 'occupied')} disabled={table.status === 'occupied'}>
                            <Utensils className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => updateTableStatus(table.id, 'cleaning')} disabled={table.status === 'cleaning'}>
                            <Coffee className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {table.status === 'occupied' && (
                        <Button variant="outline" size="sm" onClick={() => startTransfer(table.id)} title="Transférer">
                          <ArrowRightFromLine className="h-3 w-3" />
                        </Button>
                      )}
                      {table.merged_tables && (
                        <Button variant="outline" size="sm" onClick={() => executeSplit(table.id)} title="Séparer" className="text-purple-600">
                          <Split className="h-3 w-3" />
                        </Button>
                      )}
                      {table.status !== 'merged' && (
                        <Button variant="outline" size="sm" onClick={async () => {
                          if (window.electronAPI) await window.electronAPI.deleteTable(table.id);
                          setTables(prev => prev.filter(t => t.id !== table.id));
                        }} className="text-red-500">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Add Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Ajout en bulk</DialogTitle></DialogHeader>
          <form onSubmit={handleBulkSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2"><Label>Préfixe</Label><Input value={bulkFormData.prefix} onChange={(e) => setBulkFormData({ ...bulkFormData, prefix: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Début</Label><Input type="number" value={bulkFormData.start} onChange={(e) => setBulkFormData({ ...bulkFormData, start: parseInt(e.target.value) || 1 })} min="1" /></div>
              <div className="grid gap-2"><Label>Fin</Label><Input type="number" value={bulkFormData.end} onChange={(e) => setBulkFormData({ ...bulkFormData, end: parseInt(e.target.value) || 10 })} min="1" /></div>
            </div>
            <div className="grid gap-2"><Label>Capacité par table</Label><Input type="number" value={bulkFormData.capacity} onChange={(e) => setBulkFormData({ ...bulkFormData, capacity: parseInt(e.target.value) || 2 })} min="1" max="20" /></div>
            <div className="p-3 bg-gray-50 rounded-lg border">
              <p className="text-xs font-medium text-gray-500 mb-2">Aperçu ({bulkFormData.end - bulkFormData.start + 1} tables)</p>
              <div className="flex flex-wrap gap-1">
                {getBulkPreview().map((name, i) => <span key={i} className="px-2 py-0.5 bg-white border rounded text-xs font-mono">{name}</span>)}
                {bulkFormData.end - bulkFormData.start + 1 > 20 && <span className="px-2 py-0.5 text-xs text-gray-400">+{bulkFormData.end - bulkFormData.start - 19} autres...</span>}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setBulkDialogOpen(false)}>Annuler</Button>
              <Button type="submit">Créer {bulkFormData.end - bulkFormData.start + 1} tables</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTable ? 'Modifier la table' : 'Nouvelle table'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label>Numéro de table *</Label>
              <Input value={formData.table_number} onChange={(e) => setFormData({ ...formData, table_number: e.target.value })} required />
            </div>
            <div className="grid gap-2">
              <Label>Capacité</Label>
              <Input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 2 })} min="1" max="20" />
            </div>
            <div className="grid gap-2">
              <Label>Serveur attitré</Label>
              <Input value={formData.waiter} onChange={(e) => setFormData({ ...formData, waiter: e.target.value })} placeholder="Nom du serveur" />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Allergies, préférences, ..." rows={2} />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit">{editingTable ? 'Modifier' : 'Créer'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
