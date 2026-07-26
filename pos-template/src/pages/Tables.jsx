import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Users, Clock, Check, X, Edit2, Trash2, Coffee, Utensils, Merge, Split,
  ArrowRightFromLine, Receipt, UserCircle, FileText, Search, ZoomIn, ZoomOut,
  Maximize2, Grid3X3, Calendar, BarChart3, Settings, Map, AlertTriangle,
  GripVertical, ChevronDown, Eye, EyeOff, Star, Phone, Hash, Loader2,
  MoreVertical, Layers, Copy
} from 'lucide-react';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Switch } from '../components/ui/switch';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from '../components/ui/context-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

const VALID_STATUSES = ['available', 'occupied', 'reserved', 'cleaning', 'merged', 'out_of_service'];

const STATUS_CONFIG = {
  available: { color: 'bg-emerald-500 hover:bg-emerald-600', border: 'border-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50', badge: 'bg-emerald-500 text-white', label: 'Libre', ring: 'ring-emerald-400' },
  occupied: { color: 'bg-red-500 hover:bg-red-600', border: 'border-red-400', text: 'text-red-700', bg: 'bg-red-50', badge: 'bg-red-500 text-white', label: 'Occupée', ring: 'ring-red-400' },
  reserved: { color: 'bg-blue-500 hover:bg-blue-600', border: 'border-blue-400', text: 'text-blue-700', bg: 'bg-blue-50', badge: 'bg-blue-500 text-white', label: 'Réservée', ring: 'ring-blue-400' },
  cleaning: { color: 'bg-amber-500 hover:bg-amber-600', border: 'border-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', badge: 'bg-amber-500 text-white', label: 'Nettoyage', ring: 'ring-amber-400' },
  merged: { color: 'bg-purple-500 hover:bg-purple-600', border: 'border-purple-400', text: 'text-purple-700', bg: 'bg-purple-50', badge: 'bg-purple-500 text-white', label: 'Fusionnée', ring: 'ring-purple-400' },
  out_of_service: { color: 'bg-gray-500 hover:bg-gray-600', border: 'border-gray-400', text: 'text-gray-700', bg: 'bg-gray-50', badge: 'bg-gray-500 text-white', label: 'Hors service', ring: 'ring-gray-400' }
};

export default function Tables() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [activeTab, setActiveTab] = useState('floor');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [deleteZoneDialogOpen, setDeleteZoneDialogOpen] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState([]);
  const [transferMode, setTransferMode] = useState(false);
  const [transferSource, setTransferSource] = useState(null);
  const [splitBillMode, setSplitBillMode] = useState(false);
  const [splitTableId, setSplitTableId] = useState(null);

  const [formData, setFormData] = useState({ table_number: '', capacity: 2, waiter: '', notes: '', zone: '', shape: 'square' });
  const [bulkFormData, setBulkFormData] = useState({ prefix: 'T', start: 1, end: 10, capacity: 4, zone: '', waiter: '', shape: 'square', notes: '' });
  const [reservationForm, setReservationForm] = useState({ table_id: '', customer_name: '', customer_phone: '', guests: 2, reservation_date: '', reservation_time: '', duration_minutes: 120, notes: '' });
  const [zoneForm, setZoneForm] = useState({ name: '', color: '#3B82F6', description: '', server_id: '' });

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [floorSize, setFloorSize] = useState({ width: 1200, height: 800 });

  const [draggingTable, setDraggingTable] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const floorRef = useRef(null);

  const { config: electronConfig } = useAppConfig();
  const getConfig = () => {
    if (electronConfig?.theme) return POSConfiguration.createConfig(electronConfig.theme);
    return POSConfiguration.createConfig({ primaryColor: '#3b82f6', backgroundColor: '#ffffff', textColor: '#1f2937' });
  };
  const config = getConfig();

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      if (window.electronAPI) {
        const [t, z, r, u, a] = await Promise.all([
          window.electronAPI.getTables(),
          window.electronAPI.getZones().catch(() => []),
          window.electronAPI.getReservations().catch(() => []),
          window.electronAPI.getUsers().catch(() => []),
          window.electronAPI.getTableAnalytics().catch(() => null)
        ]);
        const colsPerRow = 5;
        const spacingX = 120;
        const spacingY = 120;
        const offsetX = 30;
        const offsetY = 30;
        const positioned = t.map((tbl, i) => {
          const hasCustomPosition = tbl.x != null && tbl.y != null && !(tbl.x === 50 && tbl.y === 50);
          if (hasCustomPosition) return tbl;
          const col = i % colsPerRow;
          const row = Math.floor(i / colsPerRow);
          return { ...tbl, x: offsetX + col * spacingX, y: offsetY + row * spacingY };
        });
        setTables(positioned);
        setZones(z || []);
        setReservations(r || []);
        setUsers(u || []);
        setAnalytics(a);
      }
    } catch (error) {
      console.error('Error loading tables data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async () => {
    if (!window.electronAPI) return;
    try {
      const t = await window.electronAPI.getTables();
      const colsPerRow = 5;
      const spacingX = 120;
      const spacingY = 120;
      const offsetX = 30;
      const offsetY = 30;
      const positioned = t.map((tbl, i) => {
        const hasCustomPosition = tbl.x != null && tbl.y != null && !(tbl.x === 50 && tbl.y === 50);
        if (hasCustomPosition) return tbl;
        const col = i % colsPerRow;
        const row = Math.floor(i / colsPerRow);
        return { ...tbl, x: offsetX + col * spacingX, y: offsetY + row * spacingY };
      });
      setTables(positioned);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  const loadReservations = async () => {
    if (!window.electronAPI) return;
    try {
      const r = await window.electronAPI.getReservations();
      setReservations(r || []);
    } catch (error) {
      console.error('Error loading reservations:', error);
    }
  };

  const loadAnalytics = async () => {
    if (!window.electronAPI) return;
    try {
      const a = await window.electronAPI.getTableAnalytics();
      setAnalytics(a);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.table_number.trim()) return;
    try {
      if (editingTable) {
        if (window.electronAPI) await window.electronAPI.updateTable(editingTable.id, formData);
        else setTables(prev => prev.map(t => t.id === editingTable.id ? { ...t, ...formData } : t));
      } else {
        if (window.electronAPI) await window.electronAPI.addTable(formData);
        else {
          const newTable = { id: Date.now(), ...formData, status: 'available', current_order_id: null, x: 50, y: 50 };
          setTables(prev => [...prev, newTable]);
        }
      }
      setDialogOpen(false);
      setEditingTable(null);
      setFormData({ table_number: '', capacity: 2, waiter: '', notes: '', zone: '', shape: 'square' });
      if (window.electronAPI) loadTables();
    } catch (error) {
      console.error('Error saving table:', error);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    const { prefix, start, end, capacity, zone, waiter, shape, notes } = bulkFormData;
    if (start > end) return;
    const count = end - start + 1;
    if (count > 50) return;
    try {
      if (window.electronAPI) {
        await window.electronAPI.bulkAddTables({ prefix, start, end, capacity, zone, waiter, shape, notes });
      } else {
        const colsPerRow = 5;
        const newTables = Array.from({ length: count }, (_, i) => ({
          id: Date.now() + i, table_number: `${prefix}${start + i}`, capacity, zone: zone || '',
          status: 'available', current_order_id: null, waiter: waiter || '', notes: notes || '', shape: shape || 'square',
          x: 30 + (i % colsPerRow) * 120, y: 30 + Math.floor(i / colsPerRow) * 120
        }));
        setTables(prev => [...prev, ...newTables]);
      }
      setBulkDialogOpen(false);
      setBulkFormData({ prefix: 'T', start: 1, end: 10, capacity: 4, zone: '', waiter: '', shape: 'square', notes: '' });
      if (window.electronAPI) loadTables();
    } catch (error) {
      console.error('Error bulk adding tables:', error);
    }
  };

  const handleDeleteTable = async () => {
    if (!tableToDelete) return;
    try {
      if (window.electronAPI) await window.electronAPI.deleteTable(tableToDelete.id);
      setTables(prev => prev.filter(t => t.id !== tableToDelete.id));
      setDeleteDialogOpen(false);
      setTableToDelete(null);
      if (detailSheetOpen && selectedTable?.id === tableToDelete.id) setDetailSheetOpen(false);
    } catch (error) {
      console.error('Error deleting table:', error);
    }
  };

  const updateTableStatus = async (tableId, newStatus) => {
    if (!VALID_STATUSES.includes(newStatus)) return;
    try {
      if (window.electronAPI) await window.electronAPI.updateTableStatus(tableId, newStatus);
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, status: newStatus } : t));
      if (selectedTable?.id === tableId) setSelectedTable(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error('Error updating table status:', error);
    }
  };

  const updateTablePosition = async (tableId, x, y) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, x, y } : t));
    if (window.electronAPI) {
      try { await window.electronAPI.updateTable(tableId, { x, y }); }
      catch (e) { console.error('Error saving position:', e); }
    }
  };

  const updateTableWaiter = async (tableId, waiter) => {
    try {
      if (window.electronAPI) await window.electronAPI.updateTable(tableId, { waiter });
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, waiter } : t));
      if (selectedTable?.id === tableId) setSelectedTable(prev => ({ ...prev, waiter }));
    } catch (error) {
      console.error('Error updating waiter:', error);
    }
  };

  const updateTableZone = async (tableId, zone) => {
    try {
      if (window.electronAPI) await window.electronAPI.updateTable(tableId, { zone });
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, zone } : t));
      if (selectedTable?.id === tableId) setSelectedTable(prev => ({ ...prev, zone }));
    } catch (error) {
      console.error('Error updating zone:', error);
    }
  };

  const toggleMergeSelect = (tableId) => {
    setSelectedForMerge(prev =>
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    );
  };

  const executeMerge = async () => {
    if (selectedForMerge.length < 2) return;
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
    }
  };

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
    }
    setTransferMode(false);
    setTransferSource(null);
  };

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
      const x = Math.max(0, e.clientX - floorRect.left - dragOffset.x);
      const y = Math.max(0, e.clientY - floorRect.top - dragOffset.y);
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
  }, [draggingTable, dragOffset, tables, mergeMode, transferMode, splitBillMode]);

  useEffect(() => {
    if (!mergeMode) setSelectedForMerge([]);
  }, [mergeMode]);

  const handleFloorWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.3, Math.min(3, prev + delta)));
  }, []);

  useEffect(() => {
    const floor = floorRef.current;
    if (!floor) return;
    floor.addEventListener('wheel', handleFloorWheel, { passive: false });
    return () => floor.removeEventListener('wheel', handleFloorWheel);
  }, [handleFloorWheel]);

  const openCreateDialog = () => {
    setEditingTable(null);
    setFormData({ table_number: '', capacity: 2, waiter: '', notes: '', zone: zoneFilter !== 'all' ? zoneFilter : '', shape: 'square' });
    setDialogOpen(true);
  };

  const openEditDialog = (table) => {
    setEditingTable(table);
    setFormData({ table_number: table.table_number, capacity: table.capacity, waiter: table.waiter || '', notes: table.notes || '', zone: table.zone || '', shape: table.shape || 'square' });
    setDialogOpen(true);
  };

  const openReservationDialog = (table) => {
    setEditingReservation(null);
    const today = new Date().toISOString().split('T')[0];
    setReservationForm({ table_id: table?.id?.toString() || '', customer_name: '', customer_phone: '', guests: table?.capacity || 2, reservation_date: today, reservation_time: '19:00', duration_minutes: 120, notes: '' });
    setReservationDialogOpen(true);
  };

  const handleReservationSubmit = async (e) => {
    e.preventDefault();
    if (!reservationForm.customer_name.trim() || !reservationForm.reservation_date || !reservationForm.reservation_time) return;
    try {
      const data = { ...reservationForm, table_id: reservationForm.table_id ? parseInt(reservationForm.table_id) : null, guests: parseInt(reservationForm.guests) || 2, duration_minutes: parseInt(reservationForm.duration_minutes) || 120 };
      if (editingReservation) {
        if (window.electronAPI) await window.electronAPI.updateReservation(editingReservation.id, data);
        setReservations(prev => prev.map(r => r.id === editingReservation.id ? { ...r, ...data } : r));
      } else {
        if (window.electronAPI) {
          const result = await window.electronAPI.addReservation(data);
          await loadReservations();
        }
        else {
          setReservations(prev => [...prev, { id: Date.now(), ...data, status: 'confirmed', table_number: tables.find(t => t.id === data.table_id)?.table_number }]);
        }
      }
      setReservationDialogOpen(false);
      setEditingReservation(null);
    } catch (error) {
      console.error('Error saving reservation:', error);
    }
  };

  const handleDeleteReservation = async (id) => {
    try {
      if (window.electronAPI) await window.electronAPI.deleteReservation(id);
      setReservations(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting reservation:', error);
    }
  };

  const handleZoneSubmit = async (e) => {
    e.preventDefault();
    if (!zoneForm.name.trim()) return;
    try {
      const zoneData = { ...zoneForm, server_id: zoneForm.server_id || null };
      if (editingZone) {
        if (window.electronAPI) await window.electronAPI.updateZone(editingZone.id, zoneData);
        setZones(prev => prev.map(z => z.id === editingZone.id ? { ...z, ...zoneData } : z));
      } else {
        if (window.electronAPI) {
          const result = await window.electronAPI.addZone(zoneData);
          setZones(prev => [...prev, { id: result.id, ...zoneData, sort_order: 0 }]);
        } else {
          setZones(prev => [...prev, { id: Date.now(), ...zoneData, sort_order: 0 }]);
        }
      }
      setZoneDialogOpen(false);
      setEditingZone(null);
      setZoneForm({ name: '', color: '#3B82F6', description: '', server_id: '' });
    } catch (error) {
      console.error('Error saving zone:', error);
    }
  };

  const handleDeleteZone = async () => {
    if (!zoneToDelete) return;
    try {
      if (window.electronAPI) await window.electronAPI.deleteZone(zoneToDelete.id);
      setZones(prev => prev.filter(z => z.id !== zoneToDelete.id));
      if (zoneFilter === zoneToDelete.name) setZoneFilter('all');
      setDeleteZoneDialogOpen(false);
      setZoneToDelete(null);
    } catch (error) {
      console.error('Error deleting zone:', error);
    }
  };

  const filteredTables = tables.filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.table_number.toLowerCase().includes(q) && !(t.waiter || '').toLowerCase().includes(q) && !(t.notes || '').toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (zoneFilter !== 'all' && (t.zone || '') !== zoneFilter) return false;
    return true;
  });

  const statusStats = {
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    cleaning: tables.filter(t => t.status === 'cleaning').length,
    merged: tables.filter(t => t.status === 'merged').length,
    out_of_service: tables.filter(t => t.status === 'out_of_service').length,
    total: tables.length,
    totalCapacity: tables.reduce((sum, t) => sum + (t.capacity || 0), 0)
  };

  const todayReservations = reservations.filter(r => {
    const today = new Date().toISOString().split('T')[0];
    return r.reservation_date === today && ['confirmed', 'seated'].includes(r.status);
  });

  const getBulkPreview = () => {
    const { prefix, start, end } = bulkFormData;
    if (start > end) return [];
    return Array.from({ length: Math.min(end - start + 1, 30) }, (_, i) => `${prefix}${start + i}`);
  };

  const getZoneColor = (zoneName) => {
    const zone = zones.find(z => z.name === zoneName);
    return zone?.color || '#9CA3AF';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Gestion des tables</h1>
            <p className="text-muted-foreground text-sm">Plan de salle, réservations et zones</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setBulkDialogOpen(true)}>
              <Layers className="mr-1.5 h-3.5 w-3.5" /> Bulk
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Table
            </Button>
          </div>
        </div>

        {/* Status Stats Bar */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { key: 'available', label: 'Libres', icon: Check },
            { key: 'occupied', label: 'Occupées', icon: Utensils },
            { key: 'reserved', label: 'Réservées', icon: Clock },
            { key: 'cleaning', label: 'Nettoyage', icon: Coffee },
            { key: 'merged', label: 'Fusionnées', icon: Merge },
            { key: 'out_of_service', label: 'Hors serv.', icon: AlertTriangle }
          ].map(({ key, label, icon: Icon }) => (
            <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}>
              <CardContent className="p-3 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${STATUS_CONFIG[key]?.badge || 'bg-gray-200'}`}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold">{statusStats[key] || 0}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher table, serveur..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          {zones.length > 0 && (
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Zone" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les zones</SelectItem>
                {zones.map(z => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={() => setZoneDialogOpen(true)}>
            <Map className="mr-1.5 h-3.5 w-3.5" /> Zones
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="floor" className="flex items-center gap-1.5"><Maximize2 className="h-3.5 w-3.5" /> Plan</TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Liste</TabsTrigger>
            <TabsTrigger value="reservations" className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Réservations</TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Stats</TabsTrigger>
          </TabsList>

          {/* Floor Plan Tab */}
          <TabsContent value="floor" className="space-y-3">
            {/* Floor Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 border rounded-md">
                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}><ZoomIn className="h-3.5 w-3.5" /></Button>
                </TooltipTrigger><TooltipContent>Zoom +</TooltipContent></Tooltip>
                <span className="text-xs text-muted-foreground px-1.5 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setZoom(prev => Math.max(0.3, prev - 0.2))}><ZoomOut className="h-3.5 w-3.5" /></Button>
                </TooltipTrigger><TooltipContent>Zoom -</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><Maximize2 className="h-3.5 w-3.5" /></Button>
                </TooltipTrigger><TooltipContent>Reset</TooltipContent></Tooltip>
              </div>
              <Tooltip><TooltipTrigger asChild>
                <Button variant={showGrid ? 'secondary' : 'ghost'} size="sm" className="h-8 px-2" onClick={() => setShowGrid(!showGrid)}><Grid3X3 className="h-3.5 w-3.5" /></Button>
              </TooltipTrigger><TooltipContent>Grille</TooltipContent></Tooltip>

              <div className="h-6 w-px bg-border" />

              <Button variant={mergeMode ? 'default' : 'outline'} size="sm" className="h-8" onClick={() => { setMergeMode(!mergeMode); setTransferMode(false); }}>
                <Merge className="mr-1.5 h-3.5 w-3.5" /> Fusion
              </Button>
              {tables.some(t => t.merged_tables) && (
                <Button variant="outline" size="sm" className="h-8" onClick={() => { const t = tables.find(t => t.merged_tables); if (t) executeSplit(t.id); }}>
                  <Split className="mr-1.5 h-3.5 w-3.5" /> Séparer
                </Button>
              )}

              <div className="flex-1" />

              {selectedForMerge.length >= 2 && (
                <Button size="sm" className="h-8 bg-purple-600 hover:bg-purple-700" onClick={executeMerge}>
                  <Merge className="mr-1.5 h-3.5 w-3.5" /> Confirmer ({selectedForMerge.length})
                </Button>
              )}
            </div>

            {/* Mode banners */}
            {mergeMode && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 flex items-center justify-between text-sm">
                <span className="text-purple-700">
                  {selectedForMerge.length === 0 ? 'Cliquez sur les tables à fusionner (min. 2)' : `${selectedForMerge.length} table(s) sélectionnée(s)`}
                </span>
                <Button size="sm" variant="ghost" onClick={() => setMergeMode(false)}><X className="h-3.5 w-3.5" /></Button>
              </div>
            )}
            {transferMode && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between text-sm">
                <span className="text-amber-700">
                  Transférer depuis <b>{tables.find(t => t.id === transferSource)?.table_number}</b> — Cliquez sur la destination
                </span>
                <Button size="sm" variant="ghost" onClick={() => { setTransferMode(false); setTransferSource(null); }}><X className="h-3.5 w-3.5" /></Button>
              </div>
            )}

            {/* Floor Plan */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div
                  ref={floorRef}
                  className="relative overflow-hidden bg-gray-50/50 min-h-[400px]"
                  style={{
                    backgroundImage: showGrid ? 'radial-gradient(circle, #d1d5db 1px, transparent 1px)' : 'none',
                    backgroundSize: showGrid ? `${20 * zoom}px ${20 * zoom}px` : 'auto',
                    cursor: mergeMode || transferMode ? 'pointer' : 'default'
                  }}
                >
                  <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: floorSize.width, height: floorSize.height, position: 'relative' }}>
                    {filteredTables.length === 0 ? (
                      <div className="flex items-center justify-center text-muted-foreground h-full min-h-[300px]">
                        <div className="text-center">
                          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                          <p className="font-medium">Aucune table</p>
                          <p className="text-xs">Ajoutez une table ou modifiez les filtres</p>
                        </div>
                      </div>
                    ) : (
                      filteredTables.filter(t => t.status !== 'merged').map((table) => {
                        const isSelected = selectedForMerge.includes(table.id);
                        const isTransferTarget = transferMode && table.id !== transferSource;
                        const isSource = transferMode && table.id === transferSource;
                        const zoneColor = getZoneColor(table.zone);
                        return (
                          <ContextMenu key={table.id}>
                            <ContextMenuTrigger>
                              <div
                                className={`absolute flex flex-col items-center justify-center rounded-lg text-white text-xs font-medium cursor-pointer transition-all select-none
                                  ${draggingTable === table.id ? 'shadow-2xl scale-110 z-50' : 'shadow-md z-10 hover:shadow-lg hover:z-30'}
                                  ${isSelected ? 'ring-4 ring-purple-400 scale-110 z-20' : ''}
                                  ${isSource ? 'opacity-50 ring-2 ring-amber-400' : ''}
                                  ${isTransferTarget ? 'ring-2 ring-amber-300 ring-dashed hover:ring-amber-500' : ''}
                                  ${STATUS_CONFIG[table.status]?.color || 'bg-gray-500'}
                                  ${table.status === 'merged' ? 'opacity-60' : ''}`}
                                style={{
                                  left: `${table.x || 0}px`,
                                  top: `${table.y || 0}px`,
                                  width: table.shape === 'rectangle' || table.shape === 'bar' ? '110px' : table.shape === 'circle' ? '80px' : '80px',
                                  height: table.shape === 'tall' ? '110px' : '80px',
                                  borderRadius: table.shape === 'circle' ? '50%' : table.shape === 'lounge' ? '16px' : '8px',
                                  borderTop: `3px solid ${zoneColor}`
                                }}
                                onMouseDown={(e) => handleTableMouseDown(e, table)}
                                onClick={(e) => {
                                  if (mergeMode) { toggleMergeSelect(table.id); return; }
                                  if (transferMode) { executeTransfer(table.id); return; }
                                  setSelectedTable(table);
                                  setDetailSheetOpen(true);
                                }}
                              >
                                <div className="font-bold text-sm leading-tight">{table.table_number}</div>
                                <div className="flex items-center text-[10px] opacity-90">
                                  <Users className="h-2.5 w-2.5 mr-0.5" /> {table.capacity}
                                </div>
                                {table.zone && <div className="text-[8px] bg-white/20 rounded px-1 mt-0.5 truncate max-w-[70px]">{table.zone}</div>}
                                {table.status === 'occupied' && table.dining_started_at && (() => {
                                  const mins = Math.max(0, Math.floor((Date.now() - new Date(table.dining_started_at).getTime()) / 60000));
                                  return mins > 0 ? <div className="text-[9px] bg-white/30 rounded px-1 mt-0.5 flex items-center gap-0.5"><Clock className="h-2 w-2" />{mins >= 60 ? `${Math.floor(mins/60)}h${mins%60 > 0 ? ` ${mins%60}m` : ''}` : `${mins}m`}</div> : null;
                                })()}
                                {table.customer_count > 0 && <div className="text-[9px] bg-white/30 rounded px-1 mt-0.5">{table.customer_count}p</div>}
                                {table.locked ? <div className="absolute -bottom-1 -left-1"><span className="text-[8px] bg-yellow-500 text-white rounded-full px-1">🔒</span></div> : null}
                                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${STATUS_CONFIG[table.status]?.color || 'bg-gray-500'}`} />
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                              <ContextMenuItem onClick={() => { setSelectedTable(table); setDetailSheetOpen(true); }}>
                                <Eye className="mr-2 h-3.5 w-3.5" /> Détails
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => openEditDialog(table)}>
                                <Edit2 className="mr-2 h-3.5 w-3.5" /> Modifier
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              {table.status !== 'out_of_service' && (
                                <ContextMenuItem onClick={() => updateTableStatus(table.id, 'out_of_service')}>
                                  <AlertTriangle className="mr-2 h-3.5 w-3.5" /> Hors service
                                </ContextMenuItem>
                              )}
                              {table.status === 'out_of_service' && (
                                <ContextMenuItem onClick={() => updateTableStatus(table.id, 'available')}>
                                  <Check className="mr-2 h-3.5 w-3.5" /> Remettre en service
                                </ContextMenuItem>
                              )}
                              {table.status === 'available' && (
                                <ContextMenuItem onClick={() => updateTableStatus(table.id, 'occupied')}>
                                  <Utensils className="mr-2 h-3.5 w-3.5" /> Occuper
                                </ContextMenuItem>
                              )}
                              {table.status === 'available' && (
                                <ContextMenuItem onClick={() => updateTableStatus(table.id, 'cleaning')}>
                                  <Coffee className="mr-2 h-3.5 w-3.5" /> Nettoyer
                                </ContextMenuItem>
                              )}
                              {table.status === 'cleaning' && (
                                <ContextMenuItem onClick={() => updateTableStatus(table.id, 'available')}>
                                  <Check className="mr-2 h-3.5 w-3.5" /> Libérer
                                </ContextMenuItem>
                              )}
                              <ContextMenuItem onClick={() => openReservationDialog(table)}>
                                <Calendar className="mr-2 h-3.5 w-3.5" /> Réserver
                              </ContextMenuItem>
                              {table.status === 'occupied' && (
                                <ContextMenuItem onClick={() => startTransfer(table.id)}>
                                  <ArrowRightFromLine className="mr-2 h-3.5 w-3.5" /> Transférer
                                </ContextMenuItem>
                              )}
                              {table.merged_tables && (
                                <ContextMenuItem onClick={() => executeSplit(table.id)}>
                                  <Split className="mr-2 h-3.5 w-3.5" /> Séparer
                                </ContextMenuItem>
                              )}
                              <ContextMenuSeparator />
                              <ContextMenuItem onClick={() => { setTableToDelete(table); setDeleteDialogOpen(true); }} className="text-red-600">
                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Supprimer
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        );
                      })
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* List Tab */}
          <TabsContent value="list" className="space-y-3">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-muted-foreground">Table</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Capacité</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Statut</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Zone</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Serveur</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Notes</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTables.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Aucune table trouvée</td></tr>
                      ) : filteredTables.map((table) => (
                        <tr key={table.id} className={`border-b hover:bg-muted/50 ${table.status === 'merged' ? 'opacity-60' : ''}`}>
                          <td className="p-3 font-medium">{table.table_number}</td>
                          <td className="p-3">{table.capacity} pers.</td>
                          <td className="p-3"><Badge className={STATUS_CONFIG[table.status]?.badge || 'bg-gray-500 text-white'}>{STATUS_CONFIG[table.status]?.label || table.status}</Badge></td>
                          <td className="p-3">{table.zone ? <Badge variant="outline" style={{ borderColor: getZoneColor(table.zone) }}>{table.zone}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-3">{table.waiter || <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-3 max-w-[200px] truncate">{table.notes || <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(table)}><Edit2 className="h-3.5 w-3.5" /></Button>
                              </TooltipTrigger><TooltipContent>Modifier</TooltipContent></Tooltip>
                              <Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedTable(table); setDetailSheetOpen(true); }}><Eye className="h-3.5 w-3.5" /></Button>
                              </TooltipTrigger><TooltipContent>Détails</TooltipContent></Tooltip>
                              <Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => { setTableToDelete(table); setDeleteDialogOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </TooltipTrigger><TooltipContent>Supprimer</TooltipContent></Tooltip>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reservations Tab */}
          <TabsContent value="reservations" className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Réservations du jour</h3>
              <Button size="sm" onClick={() => openReservationDialog(null)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Nouvelle réservation
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-muted-foreground">Client</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Table</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Heure</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Convives</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Statut</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Aucune réservation</td></tr>
                      ) : reservations.map((r) => (
                        <tr key={r.id} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <div className="font-medium">{r.customer_name}</div>
                            {r.customer_phone && <div className="text-xs text-muted-foreground">{r.customer_phone}</div>}
                          </td>
                          <td className="p-3">{r.table_number || <span className="text-muted-foreground">Non assignée</span>}</td>
                          <td className="p-3">{r.reservation_date}</td>
                          <td className="p-3">{r.reservation_time}</td>
                          <td className="p-3">{r.guests}</td>
                          <td className="p-3">
                            <Badge className={
                              r.status === 'confirmed' ? 'bg-blue-500 text-white' :
                              r.status === 'seated' ? 'bg-green-500 text-white' :
                              r.status === 'completed' ? 'bg-gray-500 text-white' :
                              r.status === 'cancelled' ? 'bg-red-500 text-white' :
                              'bg-amber-500 text-white'
                            }>
                              {r.status === 'confirmed' ? 'Confirmée' : r.status === 'seated' ? 'Assise' : r.status === 'completed' ? 'Terminée' : r.status === 'cancelled' ? 'Annulée' : 'Absente'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              {r.status === 'confirmed' && (
                                <Button variant="outline" size="sm" className="h-7" onClick={async () => {
                                  if (window.electronAPI) await window.electronAPI.updateReservation(r.id, { status: 'seated' });
                                  setReservations(prev => prev.map(res => res.id === r.id ? { ...res, status: 'seated' } : res));
                                }}>Enregistrer arrivée</Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDeleteReservation(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total tables</p>
                  <p className="text-2xl font-bold">{statusStats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Capacité totale</p>
                  <p className="text-2xl font-bold">{statusStats.totalCapacity}</p>
                  <p className="text-xs text-muted-foreground">places</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Taux d'occupation</p>
                  <p className="text-2xl font-bold">
                    {statusStats.total > 0 ? Math.round(((statusStats.occupied + statusStats.reserved) / statusStats.total) * 100) : 0}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Réservations aujourd'hui</p>
                  <p className="text-2xl font-bold">{todayReservations.length}</p>
                </CardContent>
              </Card>
            </div>

            {/* Zone distribution */}
            {zones.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Distribution par zone</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {zones.map(zone => {
                      const count = tables.filter(t => t.zone === zone.name).length;
                      const total = tables.length;
                      const pct = total > 0 ? (count / total) * 100 : 0;
                      return (
                        <div key={zone.id} className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }} />
                          <span className="text-sm font-medium w-32">{zone.name}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ backgroundColor: zone.color, width: `${pct}%` }} />
                          </div>
                          <span className="text-sm text-muted-foreground w-16 text-right">{count} tables</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Capacity distribution */}
            <Card>
              <CardHeader><CardTitle className="text-base">Distribution par capacité</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(tables.reduce((acc, t) => { acc[t.capacity] = (acc[t.capacity] || 0) + 1; return acc; }, {})).sort(([a], [b]) => a - b).map(([cap, count]) => (
                    <div key={cap} className="flex items-center gap-2 border rounded-lg px-3 py-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{cap} pers.</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail Sheet */}
        <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
          <SheetContent className="w-[380px] sm:w-[420px]">
            {selectedTable && (
              <ScrollArea className="h-full">
                <div className="space-y-4 py-4">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${STATUS_CONFIG[selectedTable.status]?.color}`} />
                      Table {selectedTable.table_number}
                    </SheetTitle>
                    <div className="flex gap-2 mt-2">
                      {VALID_STATUSES.filter(s => s !== 'merged').map(status => (
                        <Button
                          key={status}
                          variant={selectedTable.status === status ? 'default' : 'outline'}
                          size="sm"
                          className={`text-xs h-7 ${selectedTable.status === status ? STATUS_CONFIG[status]?.color : ''}`}
                          onClick={() => updateTableStatus(selectedTable.id, status)}
                        >
                          {STATUS_CONFIG[status]?.label}
                        </Button>
                      ))}
                    </div>
                  </SheetHeader>

                  <div className="space-y-3 px-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Capacité</span>
                      <span className="font-medium">{selectedTable.capacity} personnes</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Zone</span>
                      <Select value={selectedTable.zone || 'none'} onValueChange={(v) => updateTableZone(selectedTable.id, v === 'none' ? '' : v)}>
                        <SelectTrigger className="w-[140px] h-7 text-xs">
                          <SelectValue placeholder="Aucune" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucune</SelectItem>
                          {zones.map(z => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Serveur</span>
                      <Select value={selectedTable.waiter || 'none'} onValueChange={(v) => updateTableWaiter(selectedTable.id, v === 'none' ? '' : v)}>
                        <SelectTrigger className="w-[140px] h-7 text-xs">
                          <SelectValue placeholder="Aucun" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun</SelectItem>
                          {users.filter(u => u.is_server).map(u => (
                            <SelectItem key={u.id} value={u.fullName || u.username}>{u.fullName || u.username}</SelectItem>
                          ))}
                          {users.filter(u => u.is_server).length === 0 && <SelectItem value="none" disabled>Aucun serveur configuré</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedTable.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Notes</span>
                        <p className="mt-1 text-xs bg-amber-50 p-2 rounded border border-amber-200">{selectedTable.notes}</p>
                      </div>
                    )}
                    {selectedTable.merged_tables && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Tables fusionnées</span>
                        <p className="mt-1 text-xs bg-purple-50 p-2 rounded border border-purple-200 text-purple-700">
                          IDs: {selectedTable.merged_tables}
                        </p>
                      </div>
                    )}
                    {selectedTable.current_order_id && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Commande active</span>
                        <p className="mt-1 text-xs bg-blue-50 p-2 rounded border border-blue-200 text-blue-700">
                          <Receipt className="inline h-3 w-3 mr-1" /> Commande #{selectedTable.current_order_id}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="px-1 pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Actions rapides</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(selectedTable)}>
                        <Edit2 className="mr-1.5 h-3 w-3" /> Modifier
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openReservationDialog(selectedTable)}>
                        <Calendar className="mr-1.5 h-3 w-3" /> Réserver
                      </Button>
                      {selectedTable.status === 'occupied' && (
                        <Button size="sm" variant="outline" onClick={() => startTransfer(selectedTable.id)}>
                          <ArrowRightFromLine className="mr-1.5 h-3 w-3" /> Transférer
                        </Button>
                      )}
                      {selectedTable.merged_tables && (
                        <Button size="sm" variant="outline" onClick={() => executeSplit(selectedTable.id)}>
                          <Split className="mr-1.5 h-3 w-3" /> Séparer
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-red-500" onClick={() => { setTableToDelete(selectedTable); setDeleteDialogOpen(true); }}>
                        <Trash2 className="mr-1.5 h-3 w-3" /> Supprimer
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </SheetContent>
        </Sheet>

        {/* Delete Table Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette table ?</AlertDialogTitle>
              <AlertDialogDescription>
                La table <b>{tableToDelete?.table_number}</b> sera définitivement supprimée. Cette action est irréversible.
                {tableToDelete?.current_order_id && <><br /><br />⚠️ Cette table a une commande active (#{tableToDelete.current_order_id}).</>}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTable} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add/Edit Table Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTable ? 'Modifier la table' : 'Nouvelle table'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Numéro *</Label>
                  <Input value={formData.table_number} onChange={(e) => setFormData({ ...formData, table_number: e.target.value })} required placeholder="T1" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Capacité</Label>
                  <Input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 2 })} min="1" max="50" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Zone</Label>
                <Select value={formData.zone || 'none'} onValueChange={(v) => setFormData({ ...formData, zone: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune zone</SelectItem>
                    {zones.map(z => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Serveur attitré</Label>
                <Select value={formData.waiter || 'none'} onValueChange={(v) => setFormData({ ...formData, waiter: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun serveur</SelectItem>
                    {users.filter(u => u.is_server).map(u => (
                      <SelectItem key={u.id} value={u.fullName || u.username}>{u.fullName || u.username}</SelectItem>
                    ))}
                    {users.filter(u => u.is_server).length === 0 && <SelectItem value="none" disabled>Aucun serveur configuré</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Forme</Label>
                <div className="flex gap-2 flex-wrap">
                  {[{ value: 'square', label: 'Carré', icon: '■' }, { value: 'circle', label: 'Rond', icon: '●' }, { value: 'rectangle', label: 'Rectangle', icon: '▬' }, { value: 'tall', label: 'Long', icon: '▮' }, { value: 'bar', label: 'Bar', icon: '▬▬' }, { value: 'lounge', label: 'Salon', icon: '▢' }].map(s => (
                    <Button key={s.value} type="button" variant={formData.shape === s.value ? 'default' : 'outline'} size="sm" className="h-8 px-3 text-xs" onClick={() => setFormData({ ...formData, shape: s.value })}>
                      <span className="mr-1">{s.icon}</span> {s.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Allergies, préférences..." rows={2} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                <Button type="submit">{editingTable ? 'Enregistrer' : 'Créer'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bulk Add Dialog */}
        <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Ajout en bulk</DialogTitle>
              <DialogDescription>Crée plusieurs tables en une fois</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5"><Label className="text-xs">Préfixe</Label><Input value={bulkFormData.prefix} onChange={(e) => setBulkFormData({ ...bulkFormData, prefix: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label className="text-xs">Début</Label><Input type="number" value={bulkFormData.start} onChange={(e) => setBulkFormData({ ...bulkFormData, start: parseInt(e.target.value) || 1 })} min="1" /></div>
                <div className="grid gap-1.5"><Label className="text-xs">Fin</Label><Input type="number" value={bulkFormData.end} onChange={(e) => setBulkFormData({ ...bulkFormData, end: parseInt(e.target.value) || 10 })} min="1" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label className="text-xs">Capacité</Label><Input type="number" value={bulkFormData.capacity} onChange={(e) => setBulkFormData({ ...bulkFormData, capacity: parseInt(e.target.value) || 4 })} min="1" max="50" /></div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Zone</Label>
                  <Select value={bulkFormData.zone || 'none'} onValueChange={(v) => setBulkFormData({ ...bulkFormData, zone: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {zones.map(z => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Serveur attitré</Label>
                <Select value={bulkFormData.waiter || 'none'} onValueChange={(v) => setBulkFormData({ ...bulkFormData, waiter: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun serveur</SelectItem>
                    {users.filter(u => u.is_server).map(u => (
                      <SelectItem key={u.id} value={u.fullName || u.username}>{u.fullName || u.username}</SelectItem>
                    ))}
                    {users.filter(u => u.is_server).length === 0 && <SelectItem value="none" disabled>Aucun serveur configuré</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Forme</Label>
                <div className="flex gap-2 flex-wrap">
                  {[{ value: 'square', label: 'Carré', icon: '■' }, { value: 'circle', label: 'Rond', icon: '●' }, { value: 'rectangle', label: 'Rectangle', icon: '▬' }, { value: 'tall', label: 'Long', icon: '▮' }, { value: 'bar', label: 'Bar', icon: '▬▬' }, { value: 'lounge', label: 'Salon', icon: '▢' }].map(s => (
                    <Button key={s.value} type="button" variant={bulkFormData.shape === s.value ? 'default' : 'outline'} size="sm" className="h-8 px-3 text-xs" onClick={() => setBulkFormData({ ...bulkFormData, shape: s.value })}>
                      <span className="mr-1">{s.icon}</span> {s.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea value={bulkFormData.notes} onChange={(e) => setBulkFormData({ ...bulkFormData, notes: e.target.value })} placeholder="Notes communes à toutes les tables..." rows={2} />
              </div>
              <div className="p-3 bg-muted/50 rounded-lg border">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Aperçu — {bulkFormData.end - bulkFormData.start + 1} table(s)
                </p>
                <div className="flex flex-wrap gap-1">
                  {getBulkPreview().map((name, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white border rounded text-xs font-mono">{name}</span>
                  ))}
                  {bulkFormData.end - bulkFormData.start + 1 > 30 && (
                    <span className="px-2 py-0.5 text-xs text-muted-foreground">+{bulkFormData.end - bulkFormData.start - 29} autres...</span>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBulkDialogOpen(false)}>Annuler</Button>
                <Button type="submit">Créer {bulkFormData.end - bulkFormData.start + 1} tables</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Reservation Dialog */}
        <Dialog open={reservationDialogOpen} onOpenChange={setReservationDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingReservation ? 'Modifier réservation' : 'Nouvelle réservation'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleReservationSubmit} className="space-y-4">
              <div className="grid gap-1.5">
                <Label className="text-xs">Nom du client *</Label>
                <Input value={reservationForm.customer_name} onChange={(e) => setReservationForm({ ...reservationForm, customer_name: e.target.value })} required placeholder="Nom complet" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Téléphone</Label>
                  <Input value={reservationForm.customer_phone} onChange={(e) => setReservationForm({ ...reservationForm, customer_phone: e.target.value })} placeholder="06..." />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Convives</Label>
                  <Input type="number" value={reservationForm.guests} onChange={(e) => setReservationForm({ ...reservationForm, guests: e.target.value })} min="1" max="50" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Table</Label>
                <Select value={reservationForm.table_id || 'none'} onValueChange={(v) => setReservationForm({ ...reservationForm, table_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Non assignée" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non assignée</SelectItem>
                    {tables.filter(t => t.status !== 'out_of_service').map(t => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.table_number} ({t.capacity} pers.)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Date *</Label>
                  <Input type="date" value={reservationForm.reservation_date} onChange={(e) => setReservationForm({ ...reservationForm, reservation_date: e.target.value })} required />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Heure *</Label>
                  <Input type="time" value={reservationForm.reservation_time} onChange={(e) => setReservationForm({ ...reservationForm, reservation_time: e.target.value })} required />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Durée (minutes)</Label>
                <Input type="number" value={reservationForm.duration_minutes} onChange={(e) => setReservationForm({ ...reservationForm, duration_minutes: e.target.value })} min="30" step="30" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea value={reservationForm.notes} onChange={(e) => setReservationForm({ ...reservationForm, notes: e.target.value })} placeholder="Occasions spéciales, allergies..." rows={2} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setReservationDialogOpen(false)}>Annuler</Button>
                <Button type="submit">{editingReservation ? 'Enregistrer' : 'Réserver'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Zone Management Dialog */}
        <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Map className="h-5 w-5" /> Gestion des zones</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Zone list */}
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {zones.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucune zone définie</p>
                  ) : zones.map(zone => (
                    <div key={zone.id} className="flex items-center gap-3 p-2 border rounded-lg">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: zone.color }} />
                      <div className="flex-1">
                        <span className="text-sm font-medium">{zone.name}</span>
                        {zone.description && <p className="text-xs text-muted-foreground">{zone.description}</p>}
                        {zone.server_id && (() => {
                          const srv = users.find(u => u.id === zone.server_id);
                          return srv ? <p className="text-[10px] text-amber-600">Serveur: {srv.fullName || srv.username}</p> : null;
                        })()}
                      </div>
                      <Badge variant="secondary">{tables.filter(t => t.zone === zone.name).length}</Badge>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingZone(zone); setZoneForm({ name: zone.name, color: zone.color, description: zone.description || '', server_id: zone.server_id || '' }); }}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => { setZoneToDelete(zone); setDeleteZoneDialogOpen(true); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Add/edit zone form */}
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">{editingZone ? 'Modifier la zone' : 'Ajouter une zone'}</p>
                <form onSubmit={handleZoneSubmit} className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 grid gap-1.5">
                      <Label className="text-xs">Nom</Label>
                      <Input value={zoneForm.name} onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })} required placeholder="Ex: Terrasse" />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Couleur</Label>
                      <div className="flex gap-2">
                        <input type="color" value={zoneForm.color} onChange={(e) => setZoneForm({ ...zoneForm, color: e.target.value })} className="w-10 h-9 rounded border cursor-pointer" />
                        <Input value={zoneForm.color} onChange={(e) => setZoneForm({ ...zoneForm, color: e.target.value })} className="flex-1 text-xs font-mono" />
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Description</Label>
                    <Input value={zoneForm.description} onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })} placeholder="Optionnel" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Serveur assigné</Label>
                    <Select value={zoneForm.server_id || 'none'} onValueChange={(v) => setZoneForm({ ...zoneForm, server_id: v === 'none' ? '' : v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Aucun" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun serveur</SelectItem>
                        {users.filter(u => u.is_server).map(u => (
                          <SelectItem key={u.id} value={String(u.id)}>{u.fullName || u.username}</SelectItem>
                        ))}
                        {users.filter(u => u.is_server).length === 0 && <SelectItem value="none" disabled>Aucun serveur configuré</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">{editingZone ? 'Enregistrer' : 'Ajouter'}</Button>
                    {editingZone && (
                      <Button type="button" size="sm" variant="outline" onClick={() => { setEditingZone(null); setZoneForm({ name: '', color: '#3B82F6', description: '', server_id: '' }); }}>Annuler</Button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Zone Dialog */}
        <AlertDialog open={deleteZoneDialogOpen} onOpenChange={setDeleteZoneDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette zone ?</AlertDialogTitle>
              <AlertDialogDescription>
                La zone <b>{zoneToDelete?.name}</b> sera supprimée. Les tables dans cette zone ne seront pas supprimées mais perdront leur assignation de zone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteZone} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
