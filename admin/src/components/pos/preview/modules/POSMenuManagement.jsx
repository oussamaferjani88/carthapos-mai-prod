import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Grid, List, Sliders } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';

export const POSMenuManagement = ({ config, setNotification }) => {
  const [categories] = useState([
    { id: 1, name: 'Entrées', description: 'Plats d\'entrée', order: 1, active: true },
    { id: 2, name: 'Plats principaux', description: 'Plats de résistance', order: 2, active: true },
    { id: 3, name: 'Desserts', description: 'Desserts', order: 3, active: true },
    { id: 4, name: 'Boissons', description: 'Boissons', order: 4, active: true }
  ]);

  const [menuItems] = useState([
    { id: 1, name: 'Salade César', category: 'Entrées', price: 12.50, available: true },
    { id: 2, name: 'Steak frites', category: 'Plats principaux', price: 24.90, available: true },
    { id: 3, name: 'Tiramisu', category: 'Desserts', price: 8.50, available: true },
    { id: 4, name: 'Café expresso', category: 'Boissons', price: 2.50, available: true },
  ]);

  // Demo modifiers
  const [modifierGroups] = useState([
    { id: 1, name: 'Burger - Suppléments', type: 'checkbox', items: [
      { id: 101, name: 'Extra fromage', price: 1.50 }, { id: 102, name: 'Sans oignon', price: 0 },
      { id: 103, name: 'Sauce supplémentaire', price: 0.80 }, { id: 104, name: 'Bacon', price: 2.00 },
    ]},
    { id: 2, name: 'Frites - Taille', type: 'radio', items: [
      { id: 201, name: 'Petite', price: 0 }, { id: 202, name: 'Moyenne', price: 1.00 }, { id: 203, name: 'Grande', price: 2.00 },
    ]},
    { id: 3, name: 'Pizza - Suppléments', type: 'checkbox', items: [
      { id: 301, name: 'Extra mozzarella', price: 1.50 }, { id: 302, name: 'Olives', price: 1.00 },
      { id: 303, name: 'Champignons', price: 1.20 }, { id: 304, name: 'Jambon', price: 2.00 },
    ]},
  ]);

  const [activeTab, setActiveTab] = useState('categories');
  const notify = (msg) => { if (setNotification) setNotification(msg); };

  const textColor = config.textColor || '#1f2937';
  const mutedColor = config.textMutedColor || '#6b7280';

  return (
    <div className="space-y-6" style={{ fontFamily: config.fontFamily, fontSize: config.fontSize }}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: textColor }}>Gestion du Menu</h1>
          <p className="text-sm" style={{ color: mutedColor }}>Catégories, articles et modificateurs</p>
        </div>
      </div>

      <div className="border-b">
        <nav className="flex space-x-8">
          <button onClick={() => setActiveTab('categories')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            <Grid className="w-4 h-4 inline mr-2" />Catégories
          </button>
          <button onClick={() => setActiveTab('items')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'items' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            <List className="w-4 h-4 inline mr-2" />Articles
          </button>
          <button onClick={() => setActiveTab('modifiers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'modifiers' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            <Sliders className="w-4 h-4 inline mr-2" />Modificateurs
          </button>
        </nav>
      </div>

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map(cat => (
            <Card key={cat.id}>
              <CardContent className="p-4">
                <h4 className="font-semibold" style={{ color: textColor }}>{cat.name}</h4>
                <p className="text-sm" style={{ color: mutedColor }}>{cat.description}</p>
                <Badge variant="outline" className="mt-2">{cat.active ? 'Actif' : 'Inactif'}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'items' && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Article</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Catégorie</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Prix</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {menuItems.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: textColor }}>{item.name}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: textColor }}>{item.category}</td>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: textColor }}>{item.price.toFixed(2)} €</td>
                  <td className="px-4 py-3"><Badge variant={item.available ? 'default' : 'secondary'}>{item.available ? 'Disponible' : 'Indisponible'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'modifiers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modifierGroups.map(group => (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle className="text-lg">{group.name}</CardTitle>
                <p className="text-xs" style={{ color: mutedColor }}>
                  {group.type === 'radio' ? 'Choix unique' : 'Choix multiples'} · {group.items.length} option(s)
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-1 px-3 bg-muted/30 rounded">
                      <span className="text-sm" style={{ color: textColor }}>{item.name}</span>
                      {item.price > 0 ? (
                        <Badge variant="secondary">+{item.price.toFixed(2)} €</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Inclus</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
