import { useState, FormEvent } from 'react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Card, CardContent } from '../../../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Label } from '../../../ui/label';
import { Badge } from '../../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../ui/table';
import {
  Users, User, Phone, Mail, MapPin, Star, Edit2, Trash2, Gift,
  ShoppingBag, TrendingUp, Award, Heart, DollarSign, Receipt, X,
  ArrowUpDown, ChevronLeft, ChevronRight, BarChart3, Eye, Power,
  Download, Upload, Settings, Plus, Search,
} from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  loyalty_points: number;
  total_spent: number;
  visit_count: number;
  last_visit_date: string;
  created_at: string;
  is_active: boolean;
  tags: string;
  notes?: string;
}

const LEVELS = [
  { name: 'Bronze', min: 0, color: 'bg-orange-100 text-orange-700', ring: 'ring-orange-200' },
  { name: 'Silver', min: 200, color: 'bg-gray-100 text-gray-700', ring: 'ring-gray-200' },
  { name: 'Gold', min: 500, color: 'bg-yellow-100 text-yellow-700', ring: 'ring-yellow-200' },
  { name: 'Platinum', min: 1000, color: 'bg-purple-100 text-purple-700', ring: 'ring-purple-200' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'active', label: 'Actifs' },
  { value: 'inactive', label: 'Inactifs' },
  { value: 'vip', label: 'VIP (500+ pts)' },
  { value: 'without_purchases', label: 'Sans achats' },
  { value: 'recently_added', label: 'Récemment ajoutés' },
  { value: 'recently_active', label: 'Récemment actifs' },
];

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Nom A→Z' },
  { value: 'name-desc', label: 'Nom Z→A' },
  { value: 'created_at-desc', label: 'Récents' },
  { value: 'created_at-asc', label: 'Anciens' },
  { value: 'loyalty_points-desc', label: 'Points ↑' },
  { value: 'loyalty_points-asc', label: 'Points ↓' },
  { value: 'total_spent-desc', label: 'Dépensé ↑' },
  { value: 'total_spent-asc', label: 'Dépensé ↓' },
  { value: 'visit_count-desc', label: 'Visites ↑' },
  { value: 'visit_count-asc', label: 'Visites ↓' },
  { value: 'last_visit_date-desc', label: 'Dernière visite ↑' },
  { value: 'last_visit_date-asc', label: 'Dernière visite ↓' },
];

const PAGE_SIZE = 25;

const DEMO_CUSTOMERS: Customer[] = [
  { id: 1, name: 'Marie Dubois', email: 'marie@email.com', phone: '0123456789', address: '123 Rue de la Paix, Paris', loyalty_points: 1250, total_spent: 3450.50, visit_count: 28, last_visit_date: '2025-06-12', created_at: '2024-01-15', is_active: true, tags: 'fidèle,vip' },
  { id: 2, name: 'Pierre Martin', email: 'pierre@email.com', phone: '0987654321', address: '456 Avenue des Champs, Lyon', loyalty_points: 320, total_spent: 980.30, visit_count: 15, last_visit_date: '2025-06-10', created_at: '2024-02-20', is_active: true, tags: '' },
  { id: 3, name: 'Sophie Bernard', email: 'sophie@email.com', phone: '0612345678', address: '789 Boulevard Haussmann, Paris', loyalty_points: 520, total_spent: 1450.00, visit_count: 12, last_visit_date: '2025-06-08', created_at: '2024-03-10', is_active: true, tags: 'café' },
  { id: 4, name: 'Lucas Petit', email: 'lucas@email.com', phone: '0678901234', address: '', loyalty_points: 85, total_spent: 260.00, visit_count: 6, last_visit_date: '2025-05-30', created_at: '2024-05-05', is_active: true, tags: '' },
  { id: 5, name: 'Emma Rousseau', email: 'emma@email.com', phone: '0654321098', address: '12 Rue des Fleurs, Nantes', loyalty_points: 40, total_spent: 95.50, visit_count: 3, last_visit_date: '2025-05-22', created_at: '2025-01-12', is_active: true, tags: '' },
  { id: 6, name: 'Hugo Lefèvre', email: '', phone: '0632145678', address: '', loyalty_points: 0, total_spent: 0, visit_count: 0, last_visit_date: '', created_at: '2025-03-18', is_active: false, tags: '' },
  { id: 7, name: 'Chloé Moreau', email: 'chloe@email.com', phone: '0698765432', address: '34 Quai des Brumes, Marseille', loyalty_points: 210, total_spent: 640.75, visit_count: 9, last_visit_date: '2025-06-13', created_at: '2024-08-01', is_active: true, tags: 'restaurant' },
  { id: 8, name: 'Nathan Girard', email: 'nathan@email.com', phone: '', address: '5 Impasse du Port, Bordeaux', loyalty_points: 150, total_spent: 410.20, visit_count: 7, last_visit_date: '2025-06-01', created_at: '2024-11-22', is_active: true, tags: '' },
];

const DEMO_PURCHASES = [
  { id: 201, total: 45.50, payment_method: 'cash', created_at: '2025-06-10T14:30:00', item_count: 3 },
  { id: 202, total: 78.20, payment_method: 'card', created_at: '2025-06-08T11:15:00', item_count: 5 },
  { id: 203, total: 32.00, payment_method: 'cash', created_at: '2025-05-25T09:45:00', item_count: 2 },
];

const DEMO_FAVORITES = [
  { id: 1, name: 'Café Expresso', price: 2.50, total_qty: 8, times_bought: 5 },
  { id: 2, name: 'Croissant Nature', price: 1.80, total_qty: 6, times_bought: 4 },
  { id: 3, name: 'Salade César', price: 7.90, total_qty: 3, times_bought: 3 },
];

const EMPTY_FORM = { name: '', email: '', phone: '', address: '', loyalty_points: 0, notes: '', tags: '' };

interface POSCustomersProps {
  config: any;
  setNotification?: (n: any) => void;
}

// Ported from admin/src/components/pos/preview/modules/POSCustomers.jsx —
// real CRUD (create/edit/toggle-active/delete), status/level filters, sort,
// pagination, and a loyalty-levels reference dialog, around the same
// detail-dialog tab structure the client already had.
export const POSCustomers = ({ config, setNotification }: POSCustomersProps) => {
  const [customers, setCustomers] = useState<Customer[]>(DEMO_CUSTOMERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortBy, setSortBy] = useState('name-asc');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailTab, setDetailTab] = useState('profile');
  const [levelsOpen, setLevelsOpen] = useState(false);

  const textColor = config.textColor || '#1f2937';
  const mutedColor = config.textMutedColor || '#6b7280';

  const notify = (message: string, type = 'success') => {
    if (setNotification) setNotification({ message, type });
  };

  const formatPrice = (v: number) => {
    const val = parseFloat(String(v)) || 0;
    return config.currencyPosition === 'before' ? `${config.currency}${val.toFixed(2)}` : `${val.toFixed(2)} ${config.currency}`;
  };

  const formatDate = (d: string) => {
    if (!d) return '-';
    try { return new Date(d.endsWith('Z') ? d : d + 'Z').toLocaleDateString(); } catch { return '-'; }
  };

  const getActiveLevel = (points: number) => {
    let level = LEVELS[0];
    for (const l of LEVELS) {
      if (points >= l.min) level = l;
    }
    return level;
  };

  const filteredAndSorted = [...customers]
    .filter((c) => {
      const s = searchTerm.toLowerCase();
      const matchSearch = !s ||
        c.name.toLowerCase().includes(s) ||
        (c.email || '').toLowerCase().includes(s) ||
        (c.phone || '').includes(s) ||
        (c.address || '').toLowerCase().includes(s) ||
        (c.tags || '').toLowerCase().includes(s);
      const isActive = c.is_active !== false;
      const matchStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && isActive) ||
        (filterStatus === 'inactive' && !isActive) ||
        (filterStatus === 'vip' && (c.loyalty_points || 0) >= 500) ||
        (filterStatus === 'without_purchases' && !(c.visit_count > 0)) ||
        (filterStatus === 'recently_added' && new Date(c.created_at + 'Z') >= new Date('2025-01-01')) ||
        (filterStatus === 'recently_active' && !!c.last_visit_date && new Date(c.last_visit_date + 'Z') >= new Date('2025-06-01'));
      const matchLevel = filterLevel === 'all' || getActiveLevel(c.loyalty_points || 0).name === filterLevel;
      return matchSearch && matchStatus && matchLevel;
    })
    .sort((a, b) => {
      const [key, dir] = sortBy.split('-');
      let cmp = 0;
      switch (key) {
        case 'name': cmp = (a.name || '').localeCompare(b.name || ''); break;
        case 'created_at': cmp = (a.created_at || '').localeCompare(b.created_at || ''); break;
        case 'loyalty_points': cmp = (a.loyalty_points || 0) - (b.loyalty_points || 0); break;
        case 'total_spent': cmp = (a.total_spent || 0) - (b.total_spent || 0); break;
        case 'visit_count': cmp = (a.visit_count || 0) - (b.visit_count || 0); break;
        case 'last_visit_date': cmp = (a.last_visit_date || '').localeCompare(b.last_visit_date || ''); break;
        default: cmp = 0;
      }
      return dir === 'desc' ? -cmp : cmp;
    });

  const paginatedCustomers = filteredAndSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));

  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.is_active !== false).length,
    vip: customers.filter((c) => (c.loyalty_points || 0) >= 500).length,
    totalPoints: customers.reduce((s, c) => s + (c.loyalty_points || 0), 0),
    totalRevenue: customers.reduce((s, c) => s + (c.total_spent || 0), 0),
    avgTicket: (() => {
      const totalVisits = customers.reduce((s, c) => s + (c.visit_count || 0), 0);
      const totalSpent = customers.reduce((s, c) => s + (c.total_spent || 0), 0);
      return totalVisits > 0 ? totalSpent / totalVisits : 0;
    })(),
    avgVisits: customers.length > 0 ? customers.reduce((s, c) => s + (c.visit_count || 0), 0) / customers.length : 0,
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Le nom est obligatoire';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Format d'email invalide";
    }
    if (formData.phone && !/^[\d\s+()-]{6,}$/.test(formData.phone)) {
      errors.phone = 'Format de téléphone invalide';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      loyalty_points: parseInt(String(formData.loyalty_points)) || 0,
      notes: formData.notes.trim(),
      tags: formData.tags.trim(),
    };
    if (editingCustomer) {
      setCustomers(customers.map((c) => (c.id === editingCustomer.id ? { ...c, ...payload } : c)));
      notify(`Client "${payload.name}" modifié`);
    } else {
      setCustomers([...customers, { id: Date.now(), total_spent: 0, visit_count: 0, last_visit_date: '', created_at: new Date().toISOString().split('T')[0], is_active: true, ...payload }]);
      notify(`Client "${payload.name}" créé`);
    }
    setDialogOpen(false);
    setEditingCustomer(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
  };

  const openCreateDialog = () => {
    setEditingCustomer(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      loyalty_points: customer.loyalty_points || 0,
      notes: customer.notes || '',
      tags: customer.tags || '',
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const openDetailView = (customer: Customer) => {
    setDetailCustomer(customer);
    setDetailTab('profile');
    setDetailOpen(true);
  };

  const handleToggleActive = (customer: Customer) => {
    setCustomers(customers.map((c) => (c.id === customer.id ? { ...c, is_active: c.is_active === false } : c)));
    notify(customer.is_active === false ? 'Client activé' : 'Client désactivé');
  };

  const handleDelete = (customer: Customer) => {
    if (window.confirm(`Supprimer le client "${customer.name}" ?`)) {
      setCustomers(customers.filter((c) => c.id !== customer.id));
      notify(`Client "${customer.name}" supprimé`);
    }
  };

  const hasFilters = !!searchTerm || filterStatus !== 'all' || filterLevel !== 'all';

  return (
    <div className="space-y-4 py-6" style={{ fontFamily: config.fontFamily, fontSize: config.fontSize, color: textColor }}>
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: textColor }}>
            <Users className="h-6 w-6" /> Gestion des clients
          </h1>
          <p className="text-sm" style={{ color: mutedColor }}>
            {stats.total} client{stats.total > 1 ? 's' : ''} enregistré{stats.total > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => notify('Import CSV simulé (démo)')}>
            <Upload className="h-4 w-4 mr-1" /> Importer
          </Button>
          <Button variant="outline" size="sm" onClick={() => notify('Export CSV simulé (démo)')} disabled={filteredAndSorted.length === 0}>
            <Download className="h-4 w-4 mr-1" /> Exporter
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLevelsOpen(true)}>
            <Settings className="h-4 w-4 mr-1" /> Niveaux
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1" /> Nouveau client
          </Button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total clients', value: stats.total, icon: Users, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Actifs', value: stats.active, icon: User, color: '#22c55e', bg: '#f0fdf4' },
          { label: 'VIP (500+)', value: stats.vip, icon: Star, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Points totaux', value: stats.totalPoints.toLocaleString(), icon: Gift, color: '#8b5cf6', bg: '#f5f3ff' },
          { label: 'CA total', value: formatPrice(stats.totalRevenue), icon: DollarSign, color: '#14b8a6', bg: '#f0fdfa' },
          { label: 'Panier moyen', value: formatPrice(stats.avgTicket), icon: ShoppingBag, color: '#ec4899', bg: '#fdf2f8' },
          { label: 'Visites moy.', value: stats.avgVisits.toFixed(1), icon: BarChart3, color: '#f97316', bg: '#fff7ed' },
        ].map((stat, i) => (
          <Card key={i} className="transition-all hover:shadow-md hover:scale-[1.02]">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: stat.bg }}>
                  <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                  <p className="text-sm font-bold tabular-nums truncate">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SEARCH + FILTERS */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, téléphone, adresse, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-[140px] h-9">
            <Award className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous niveaux</SelectItem>
            {LEVELS.map((l) => (<SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px] h-9">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterLevel('all'); }}>
            <X className="h-3.5 w-3.5 mr-1" /> Réinitialiser
          </Button>
        )}
      </div>

      <p className="text-xs" style={{ color: mutedColor }}>
        {filteredAndSorted.length} client{filteredAndSorted.length !== 1 ? 's' : ''} affiché{filteredAndSorted.length !== 1 ? 's' : ''} sur {customers.length}
      </p>

      {/* CUSTOMER TABLE */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Fidélité</TableHead>
                  <TableHead className="text-right">Visites</TableHead>
                  <TableHead className="text-right">Total dépensé</TableHead>
                  <TableHead>Dernière visite</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>{hasFilters ? 'Aucun client trouvé pour cette recherche' : 'Aucun client enregistré'}</p>
                    </TableCell>
                  </TableRow>
                ) : paginatedCustomers.map((customer) => {
                  const level = getActiveLevel(customer.loyalty_points || 0);
                  const isActive = customer.is_active !== false;
                  const tagsList = customer.tags ? customer.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
                  return (
                    <TableRow key={customer.id} className="cursor-pointer" onClick={() => openDetailView(customer)}>
                      <TableCell>
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-muted-foreground">{customer.name.charAt(0).toUpperCase()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm leading-tight">{customer.name}</p>
                          {tagsList.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {tagsList.slice(0, 2).map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0">{tag}</Badge>
                              ))}
                              {tagsList.length > 2 && <span className="text-[9px] text-muted-foreground">+{tagsList.length - 2}</span>}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 text-xs text-muted-foreground">
                          {customer.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3 flex-shrink-0" /><span className="truncate max-w-[150px]">{customer.email}</span></div>}
                          {customer.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3 flex-shrink-0" /><span>{customer.phone}</span></div>}
                          {customer.address && <div className="flex items-center gap-1"><MapPin className="h-3 w-3 flex-shrink-0" /><span className="truncate max-w-[150px]">{customer.address}</span></div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={`${level.color} text-[10px]`}>{level.name}</Badge>
                          <span className="text-xs text-muted-foreground tabular-nums">{customer.loyalty_points || 0} pts</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{customer.visit_count || 0}</TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">{formatPrice(customer.total_spent)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(customer.last_visit_date)}</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? 'default' : 'secondary'} className="text-[10px]">{isActive ? 'Actif' : 'Inactif'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(customer)} title="Modifier"><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetailView(customer)} title="Détails"><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleToggleActive(customer)} title={isActive ? 'Désactiver' : 'Activer'}>
                            <Power className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(customer)} title="Supprimer"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">Page {page} / {totalPages}</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-7" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingCustomer ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1">
            <div className="grid gap-2">
              <Label>Nom *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nom complet" className={formErrors.name ? 'border-destructive' : ''} />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@exemple.com" className={formErrors.email ? 'border-destructive' : ''} />
              {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Téléphone</Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="0123456789" className={formErrors.phone ? 'border-destructive' : ''} />
              {formErrors.phone && <p className="text-xs text-destructive">{formErrors.phone}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Adresse</Label>
              <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Adresse" />
            </div>
            <div className="grid gap-2">
              <Label>Points fidélité</Label>
              <Input type="number" min="0" value={formData.loyalty_points} onChange={(e) => setFormData({ ...formData, loyalty_points: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground">Niveau: {getActiveLevel(parseInt(String(formData.loyalty_points)) || 0).name}</p>
            </div>
            <div className="grid gap-2">
              <Label>Tags</Label>
              <Input value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="fidèle, vip..." />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit">{editingCustomer ? 'Enregistrer' : 'Créer'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DETAIL DIALOG */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2"><User className="h-5 w-5" />{detailCustomer?.name}</DialogTitle>
          </DialogHeader>
          {detailCustomer && (
            <div className="flex flex-col flex-1 min-h-0 gap-4">
              <div className="border-b">
                <nav className="flex space-x-6 overflow-x-auto">
                  {[
                    { key: 'profile', label: 'Profil', icon: User },
                    { key: 'purchases', label: 'Achats', icon: ShoppingBag },
                    { key: 'stats', label: 'Statistiques', icon: TrendingUp },
                    { key: 'favorites', label: 'Favoris', icon: Heart },
                  ].map((tab) => (
                    <button key={tab.key} onClick={() => setDetailTab(tab.key)}
                      className={`py-2 border-b-2 font-medium text-sm flex items-center gap-1 whitespace-nowrap ${detailTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                      <tab.icon className="h-4 w-4" />{tab.label}
                    </button>
                  ))}
                </nav>
              </div>
              {detailTab === 'profile' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground">Email</Label><p>{detailCustomer.email || '-'}</p></div>
                  <div><Label className="text-muted-foreground">Téléphone</Label><p>{detailCustomer.phone || '-'}</p></div>
                  <div><Label className="text-muted-foreground">Adresse</Label><p>{detailCustomer.address || '-'}</p></div>
                  <div><Label className="text-muted-foreground">Inscription</Label><p>{formatDate(detailCustomer.created_at)}</p></div>
                  <div>
                    <Label className="text-muted-foreground">Points fidélité</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`${getActiveLevel(detailCustomer.loyalty_points || 0).color} text-xs`}>{getActiveLevel(detailCustomer.loyalty_points || 0).name}</Badge>
                      <span className="font-bold">{detailCustomer.loyalty_points || 0} pts</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Statut</Label>
                    <div className="mt-1">
                      <Badge variant={detailCustomer.is_active !== false ? 'default' : 'secondary'} className="text-[10px]">
                        {detailCustomer.is_active !== false ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
              {detailTab === 'purchases' && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {DEMO_PURCHASES.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        <div><p className="text-sm font-medium">#{p.id}</p><p className="text-xs text-muted-foreground">{new Date(p.created_at + 'Z').toLocaleString()}</p></div>
                      </div>
                      <div className="text-right"><p className="font-medium">{formatPrice(p.total)}</p><p className="text-xs text-muted-foreground">{p.item_count} article(s) · {p.payment_method}</p></div>
                    </div>
                  ))}
                </div>
              )}
              {detailTab === 'stats' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Visites', value: detailCustomer.visit_count || 0, icon: ShoppingBag, color: 'text-blue-500' },
                    { label: 'Total dépensé', value: formatPrice(detailCustomer.total_spent), icon: DollarSign, color: 'text-green-500' },
                    { label: 'Panier moyen', value: formatPrice(detailCustomer.visit_count > 0 ? (detailCustomer.total_spent || 0) / detailCustomer.visit_count : 0), icon: TrendingUp, color: 'text-purple-500' },
                    { label: 'Points fidélité', value: detailCustomer.loyalty_points || 0, icon: Award, color: 'text-amber-500' },
                  ].map((s) => (
                    <Card key={s.label}>
                      <CardContent className="p-4 text-center">
                        <s.icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
                        <p className="text-xl font-bold">{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {detailTab === 'favorites' && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {DEMO_FAVORITES.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Heart className="h-4 w-4 text-red-400" />
                        <div><p className="text-sm font-medium">{f.name}</p><p className="text-xs text-muted-foreground">{formatPrice(f.price)}</p></div>
                      </div>
                      <div className="text-right"><p className="font-medium">×{f.total_qty}</p><p className="text-xs text-muted-foreground">{f.times_bought} fois</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LEVELS DIALOG */}
      <Dialog open={levelsOpen} onOpenChange={setLevelsOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Niveaux de fidélité</DialogTitle>
            <DialogDescription>Seuils de points pour chaque niveau</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {[...LEVELS].reverse().map((l) => (
              <div key={l.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge className={l.color}>{l.name}</Badge>
                  <span className="text-sm text-muted-foreground">dès {l.min} pts</span>
                </div>
                <Award className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLevelsOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSCustomers;
