import { useState, useEffect } from 'react';
import { 
  Plus, Search, User, Phone, Mail, MapPin, Star, Edit2, Trash2, Gift,
  ShoppingBag, TrendingUp, Award, Heart, Clock, DollarSign, Receipt,
  X
} from 'lucide-react';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

export default function Customers() {
  const { config: electronConfig } = useAppConfig();
  const getConfig = () => {
    if (electronConfig && electronConfig.theme) {
      return POSConfiguration.createConfig(electronConfig.theme);
    }
    return POSConfiguration.createConfig({
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937'
    });
  };
  const config = getConfig();
  const styles = POSConfiguration.getStyles(config);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', loyalty_points: 0
  });

  const [detailCustomer, setDetailCustomer] = useState(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [detailTab, setDetailTab] = useState('profile');
  const [purchases, setPurchases] = useState([]);
  const [stats, setStats] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      if (window.electronAPI) {
        const customers = await window.electronAPI.getCustomers();
        setCustomers(customers);
      } else {
        setCustomers([
          { id: 1, name: 'Marie Dubois', email: 'marie@email.com', phone: '0123456789', address: '123 Rue de la Paix, Paris', loyalty_points: 150, total_spent: 450.50, created_at: '2024-01-15' },
          { id: 2, name: 'Pierre Martin', email: 'pierre@email.com', phone: '0987654321', address: '456 Avenue des Champs, Lyon', loyalty_points: 75, total_spent: 220.30, created_at: '2024-02-20' }
        ]);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { alert('Le nom est obligatoire'); return; }
    try {
      if (editingCustomer) {
        if (window.electronAPI) await window.electronAPI.updateCustomer(editingCustomer.id, formData);
      } else {
        if (window.electronAPI) await window.electronAPI.addCustomer(formData);
      }
      setDialogOpen(false);
      setEditingCustomer(null);
      setFormData({ name: '', email: '', phone: '', address: '', loyalty_points: 0 });
      loadCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const openEditDialog = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name, email: customer.email || '', phone: customer.phone || '',
      address: customer.address || '', loyalty_points: customer.loyalty_points || 0
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingCustomer(null);
    setFormData({ name: '', email: '', phone: '', address: '', loyalty_points: 0 });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      try {
        if (window.electronAPI) await window.electronAPI.deleteCustomer(id);
        loadCustomers();
      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const openDetailView = async (customer) => {
    setDetailCustomer(customer);
    setDetailDialog(true);
    setDetailTab('profile');
    setLoadingDetail(true);
    try {
      if (window.electronAPI) {
        const [purchasesData, statsData, favData] = await Promise.all([
          window.electronAPI.getCustomerPurchases(customer.id).catch(() => []),
          window.electronAPI.getCustomerStats(customer.id).catch(() => null),
          window.electronAPI.getCustomerFavoriteProducts(customer.id).catch(() => [])
        ]);
        setPurchases(purchasesData || []);
        setStats(statsData);
        setFavorites(favData || []);
      } else {
        setPurchases([
          { id: 101, total: 45.50, payment_method: 'cash', created_at: '2025-06-10T14:30:00', item_count: 3 },
          { id: 102, total: 78.20, payment_method: 'card', created_at: '2025-06-08T11:15:00', item_count: 5 },
        ]);
        setStats({ visit_count: 2, total_spent: 123.70, average_ticket: 61.85, total_discounts: 5.50 });
        setFavorites([
          { id: 1, name: 'Café expresso', price: 2.50, total_qty: 6, times_bought: 4 },
          { id: 2, name: 'Croissant', price: 1.80, total_qty: 4, times_bought: 3 },
        ]);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingDetail(false); }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  );

  const getLoyaltyLevel = (points) => {
    if (points >= 500) return { level: 'VIP', color: 'bg-purple-500' };
    if (points >= 200) return { level: 'Gold', color: 'bg-yellow-500' };
    if (points >= 50) return { level: 'Silver', color: 'bg-gray-400' };
    return { level: 'Bronze', color: 'bg-orange-600' };
  };

  const formatCurrency = (v) => (parseFloat(v) || 0).toFixed(2) + '\u20AC';
  const formatDate = (d) => d ? new Date(d + 'Z').toLocaleDateString() : '-';
  const formatDateTime = (d) => d ? new Date(d + 'Z').toLocaleString() : '-';

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des clients</h1>
          <p className="text-muted-foreground">Gérez vos clients et leur historique d'achats</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />Nouveau client
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total clients</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Clients VIP</p>
                <p className="text-2xl font-bold">{customers.filter(c => c.loyalty_points >= 500).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Gift className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Points totaux</p>
                <p className="text-2xl font-bold">{customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">CA total clients</p>
                <p className="text-2xl font-bold">{customers.reduce((sum, c) => sum + (c.total_spent || 0), 0).toFixed(2)}\u20AC</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un client..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des clients</CardTitle>
          <CardDescription>{filteredCustomers.length} client(s) trouvé(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Fidélité</TableHead>
                <TableHead>Total dépensé</TableHead>
                <TableHead>Inscription</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => {
                const loyalty = getLoyaltyLevel(customer.loyalty_points || 0);
                return (
                  <TableRow key={customer.id} className="cursor-pointer" onClick={() => openDetailView(customer)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {customer.email && <div className="flex items-center space-x-1"><Mail className="h-3 w-3" /><span>{customer.email}</span></div>}
                        {customer.phone && <div className="flex items-center space-x-1"><Phone className="h-3 w-3" /><span>{customer.phone}</span></div>}
                        {customer.address && <div className="flex items-center space-x-1"><MapPin className="h-3 w-3" /><span className="truncate max-w-xs">{customer.address}</span></div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Badge className={loyalty.color + ' text-white'}>{loyalty.level}</Badge>
                        <span className="text-sm">{customer.loyalty_points || 0} pts</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="font-medium">{(customer.total_spent || 0).toFixed(2)}\u20AC</span></TableCell>
                    <TableCell>{formatDate(customer.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2" onClick={e => e.stopPropagation()}>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(customer)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(customer.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCustomer ? 'Modifier le client' : 'Nouveau client'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2"><Label>Nom *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
            <div className="grid gap-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Téléphone</Label><Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Adresse</Label><Textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows={3} /></div>
            <div className="grid gap-2"><Label>Points de fidélité</Label><Input type="number" value={formData.loyalty_points} onChange={(e) => setFormData({ ...formData, loyalty_points: parseInt(e.target.value) || 0 })} /></div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit">{editingCustomer ? 'Modifier' : 'Créer'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />{detailCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          {detailCustomer && (
            <div className="space-y-4">
              <div className="border-b">
                <nav className="flex space-x-6">
                  {[
                    { key: 'profile', label: 'Profil', icon: User },
                    { key: 'purchases', label: 'Achats', icon: ShoppingBag },
                    { key: 'stats', label: 'Statistiques', icon: TrendingUp },
                    { key: 'favorites', label: 'Favoris', icon: Heart },
                  ].map(tab => (
                    <button key={tab.key} onClick={() => setDetailTab(tab.key)}
                      className={`py-2 border-b-2 font-medium text-sm flex items-center gap-1 ${detailTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
                      <tab.icon className="h-4 w-4" />{tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {detailTab === 'profile' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label className="text-muted-foreground">Email</Label><p>{detailCustomer.email || '-'}</p></div>
                  <div className="space-y-2"><Label className="text-muted-foreground">Téléphone</Label><p>{detailCustomer.phone || '-'}</p></div>
                  <div className="space-y-2"><Label className="text-muted-foreground">Adresse</Label><p>{detailCustomer.address || '-'}</p></div>
                  <div className="space-y-2"><Label className="text-muted-foreground">Inscription</Label><p>{formatDate(detailCustomer.created_at)}</p></div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Points fidélité</Label>
                    <div className="flex items-center gap-2">
                      <Badge className={getLoyaltyLevel(detailCustomer.loyalty_points || 0).color + ' text-white'}>{getLoyaltyLevel(detailCustomer.loyalty_points || 0).level}</Badge>
                      <span className="font-bold">{detailCustomer.loyalty_points || 0} pts</span>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'purchases' && (
                <div>
                  {loadingDetail ? (
                    <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
                  ) : purchases.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Aucun achat trouvé</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {purchases.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">#{p.id}</p>
                              <p className="text-xs text-muted-foreground">{formatDateTime(p.created_at)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(p.total)}</p>
                            <p className="text-xs text-muted-foreground">{p.item_count || 0} article(s) · {p.payment_method}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'stats' && (
                <div>
                  {loadingDetail ? (
                    <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <ShoppingBag className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                          <p className="text-2xl font-bold">{stats?.visit_count || 0}</p>
                          <p className="text-xs text-muted-foreground">Visites</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-500" />
                          <p className="text-2xl font-bold">{formatCurrency(stats?.total_spent)}</p>
                          <p className="text-xs text-muted-foreground">Total dépensé</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                          <p className="text-2xl font-bold">{formatCurrency(stats?.average_ticket)}</p>
                          <p className="text-xs text-muted-foreground">Panier moyen</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Award className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                          <p className="text-2xl font-bold">{detailCustomer.loyalty_points || 0}</p>
                          <p className="text-xs text-muted-foreground">Points fidélité</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'favorites' && (
                <div>
                  {loadingDetail ? (
                    <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" /></div>
                  ) : favorites.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Aucun produit favori</p>
                  ) : (
                    <div className="space-y-2">
                      {favorites.map(f => (
                        <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Heart className="h-4 w-4 text-red-400" />
                            <div>
                              <p className="text-sm font-medium">{f.name}</p>
                              <p className="text-xs text-muted-foreground">{formatCurrency(f.price)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">×{f.total_qty}</p>
                            <p className="text-xs text-muted-foreground">{f.times_bought} fois</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDetailDialog(false)}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
