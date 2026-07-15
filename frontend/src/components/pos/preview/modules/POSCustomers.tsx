import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../ui/dialog';
import {
  Users, Search, User, Phone, Mail, Star, Gift,
  ShoppingBag, TrendingUp, Award, Heart, DollarSign, Receipt, Plus
} from 'lucide-react';

interface CustomerData {
  id: number; name: string; email?: string; phone?: string; address?: string; loyalty_points: number; total_spent: number; created_at: string;
}
interface PurchaseData { id: number; total: number; payment_method: string; created_at: string; item_count: number; }
interface FavoriteData { id: number; name: string; price: number; total_qty: number; times_bought: number; }

export const POSCustomers = ({ config }: { config: any }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [detailDialog, setDetailDialog] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<CustomerData | null>(null);
  const [detailTab, setDetailTab] = useState('profile');

  const demoCustomers: CustomerData[] = [
    { id: 1, name: 'Marie Dubois', email: 'marie@email.com', phone: '0123456789', address: '123 Rue de la Paix, Paris', loyalty_points: 150, total_spent: 450.50, created_at: '2024-01-15' },
    { id: 2, name: 'Pierre Martin', email: 'pierre@email.com', phone: '0987654321', address: '456 Avenue des Champs, Lyon', loyalty_points: 75, total_spent: 220.30, created_at: '2024-02-20' },
    { id: 3, name: 'Sophie Bernard', email: 'sophie@email.com', phone: '0612345678', address: '789 Boulevard Haussmann, Paris', loyalty_points: 520, total_spent: 1250.00, created_at: '2024-03-10' },
  ];

  const demoPurchases: PurchaseData[] = [
    { id: 101, total: 45.50, payment_method: 'cash', created_at: '2025-06-10T14:30:00', item_count: 3 },
    { id: 102, total: 78.20, payment_method: 'card', created_at: '2025-06-08T11:15:00', item_count: 5 },
  ];

  const demoStats = { visit_count: 2, total_spent: 123.70, average_ticket: 61.85 };
  const demoFavorites: FavoriteData[] = [
    { id: 1, name: 'Café expresso', price: 2.50, total_qty: 8, times_bought: 5 },
    { id: 2, name: 'Croissant', price: 1.80, total_qty: 6, times_bought: 4 },
  ];

  const filteredCustomers = demoCustomers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  const getLoyaltyLevel = (points: number) => {
    if (points >= 500) return { level: 'VIP', color: 'bg-purple-500' };
    if (points >= 200) return { level: 'Gold', color: 'bg-yellow-500' };
    if (points >= 50) return { level: 'Silver', color: 'bg-gray-400' };
    return { level: 'Bronze', color: 'bg-orange-600' };
  };

  const openDetail = (customer: CustomerData) => { setDetailCustomer(customer); setDetailTab('profile'); setDetailDialog(true); };

  const textColor = config.textColor || '#1f2937';
  const mutedColor = config.textMutedColor || '#6b7280';

  return (
    <div className="space-y-6" style={{ fontFamily: config.fontFamily, fontSize: config.fontSize }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: textColor }}>Gestion des clients</h1>
          <p className="text-sm" style={{ color: mutedColor }}>Gérez vos clients et leur historique d'achats</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" />Nouveau client</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total clients', value: demoCustomers.length, icon: Users },
          { label: 'Clients VIP', value: demoCustomers.filter(c => c.loyalty_points >= 500).length, icon: Star },
          { label: 'Points totaux', value: demoCustomers.reduce((s, c) => s + (c.loyalty_points || 0), 0), icon: Gift },
          { label: 'CA total', value: demoCustomers.reduce((s, c) => s + (c.total_spent || 0), 0).toFixed(2) + '\u20AC', icon: DollarSign },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-muted-foreground" />
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold" style={{ color: textColor }}>{s.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un client..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Liste des clients</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  {['Nom', 'Contact', 'Fidélité', 'Total dépensé', 'Inscription', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCustomers.map(c => {
                  const loyalty = getLoyaltyLevel(c.loyalty_points || 0);
                  return (
                    <tr key={c.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openDetail(c)}>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="font-medium" style={{ color: textColor }}>{c.name}</span></div></td>
                      <td className="px-4 py-3 text-sm">
                        {c.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</div>}
                        {c.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</div>}
                      </td>
                      <td className="px-4 py-3"><Badge className={loyalty.color + ' text-white'}>{loyalty.level}</Badge> <span className="text-sm">{c.loyalty_points} pts</span></td>
                      <td className="px-4 py-3 font-medium">{(c.total_spent || 0).toFixed(2)}\u20AC</td>
                      <td className="px-4 py-3 text-sm">{new Date(c.created_at + 'Z').toLocaleDateString()}</td>
                      <td className="px-4 py-3"><Button variant="outline" size="sm"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><User className="h-5 w-5" />{detailCustomer?.name}</DialogTitle></DialogHeader>
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
                  <div><Label className="text-muted-foreground">Email</Label><p>{detailCustomer.email || '-'}</p></div>
                  <div><Label className="text-muted-foreground">Téléphone</Label><p>{detailCustomer.phone || '-'}</p></div>
                  <div><Label className="text-muted-foreground">Adresse</Label><p>{detailCustomer.address || '-'}</p></div>
                  <div><Label className="text-muted-foreground">Inscription</Label><p>{new Date(detailCustomer.created_at + 'Z').toLocaleDateString()}</p></div>
                  <div>
                    <Label className="text-muted-foreground">Points fidélité</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={getLoyaltyLevel(detailCustomer.loyalty_points || 0).color + ' text-white'}>{getLoyaltyLevel(detailCustomer.loyalty_points || 0).level}</Badge>
                      <span className="font-bold">{detailCustomer.loyalty_points || 0} pts</span>
                    </div>
                  </div>
                </div>
              )}
              {detailTab === 'purchases' && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {demoPurchases.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        <div><p className="text-sm font-medium">#{p.id}</p><p className="text-xs text-muted-foreground">{new Date(p.created_at + 'Z').toLocaleString()}</p></div>
                      </div>
                      <div className="text-right"><p className="font-medium">{(p.total).toFixed(2)}\u20AC</p><p className="text-xs text-muted-foreground">{p.item_count} article(s) · {p.payment_method}</p></div>
                    </div>
                  ))}
                </div>
              )}
              {detailTab === 'stats' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Visites', value: demoStats.visit_count, icon: ShoppingBag, color: 'text-blue-500' },
                    { label: 'Total dépensé', value: demoStats.total_spent.toFixed(2) + '\u20AC', icon: DollarSign, color: 'text-green-500' },
                    { label: 'Panier moyen', value: demoStats.average_ticket.toFixed(2) + '\u20AC', icon: TrendingUp, color: 'text-purple-500' },
                    { label: 'Points fidélité', value: detailCustomer.loyalty_points || 0, icon: Award, color: 'text-amber-500' },
                  ].map(s => (
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
                <div className="space-y-2">
                  {demoFavorites.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Heart className="h-4 w-4 text-red-400" />
                        <div><p className="text-sm font-medium">{f.name}</p><p className="text-xs text-muted-foreground">{(f.price).toFixed(2)}\u20AC</p></div>
                      </div>
                      <div className="text-right"><p className="font-medium">×{f.total_qty}</p><p className="text-xs text-muted-foreground">{f.times_bought} fois</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDetailDialog(false)}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSCustomers;
