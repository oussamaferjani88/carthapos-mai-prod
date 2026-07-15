import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Package, DollarSign, Tag, Grid, List, Sliders } from 'lucide-react';
import { useThemeApplier } from '../hooks/useThemeApplier';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';

const MenuManagement = () => {
  useThemeApplier();

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

  const [categories, setCategories] = useState([
    { id: 1, name: 'Entrées', description: 'Plats d\'entrée', order: 1, active: true },
    { id: 2, name: 'Plats principaux', description: 'Plats de résistance', order: 2, active: true },
    { id: 3, name: 'Desserts', description: 'Desserts et sucreries', order: 3, active: true },
    { id: 4, name: 'Boissons', description: 'Boissons chaudes et froides', order: 4, active: true }
  ]);

  const [menuItems, setMenuItems] = useState([
    { id: 1, name: 'Salade César', description: 'Salade fraîche avec croûtons', price: 12.50, categoryId: 1, available: true },
    { id: 2, name: 'Steak frites', description: 'Steak grillé avec frites maison', price: 24.90, categoryId: 2, available: true },
    { id: 3, name: 'Tiramisu', description: 'Dessert italien traditionnel', price: 8.50, categoryId: 3, available: true },
    { id: 4, name: 'Café expresso', description: 'Café italien corsé', price: 2.50, categoryId: 4, available: true },
    { id: 5, name: 'Burger', description: 'Boeuf haché, salade, tomate', price: 16.90, categoryId: 2, available: true },
    { id: 6, name: 'Pizza Margherita', description: 'Tomate, mozzarella, basilic', price: 14.50, categoryId: 2, available: true },
    { id: 7, name: 'Frites', description: 'Frites maison', price: 4.50, categoryId: 2, available: true },
    { id: 8, name: 'Eau minérale', description: '50cl', price: 3.00, categoryId: 4, available: true }
  ]);

  // Modifier Groups
  const [modifierGroups, setModifierGroups] = useState([
    { id: 1, name: 'Burger - Suppléments', type: 'checkbox', minSelect: 0, maxSelect: 5, items: [
      { id: 101, name: 'Extra fromage', price: 1.50, defaultSelected: false },
      { id: 102, name: 'Sans oignon', price: 0, defaultSelected: false },
      { id: 103, name: 'Sauce supplémentaire', price: 0.80, defaultSelected: false },
      { id: 104, name: 'Bacon', price: 2.00, defaultSelected: false },
      { id: 105, name: 'Double viande', price: 3.50, defaultSelected: false }
    ]},
    { id: 2, name: 'Frites - Taille', type: 'radio', minSelect: 1, maxSelect: 1, items: [
      { id: 201, name: 'Petite', price: 0, defaultSelected: false },
      { id: 202, name: 'Moyenne', price: 1.00, defaultSelected: true },
      { id: 203, name: 'Grande', price: 2.00, defaultSelected: false }
    ]},
    { id: 3, name: 'Pizza - Suppléments', type: 'checkbox', minSelect: 0, maxSelect: 4, items: [
      { id: 301, name: 'Extra mozzarella', price: 1.50, defaultSelected: false },
      { id: 302, name: 'Olives', price: 1.00, defaultSelected: false },
      { id: 303, name: 'Champignons', price: 1.20, defaultSelected: false },
      { id: 304, name: 'Jambon', price: 2.00, defaultSelected: false }
    ]}
  ]);

  const [activeTab, setActiveTab] = useState('categories');
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '', description: '', price: '', categoryId: categories[0]?.id || 1
  });
  const [newCategory, setNewCategory] = useState({
    name: '', description: '', order: categories.length + 1
  });

  // Modifier state
  const [editingGroup, setEditingGroup] = useState(null);
  const [newGroup, setNewGroup] = useState({
    name: '', type: 'checkbox', minSelect: 0, maxSelect: 5
  });
  const [newModifierItem, setNewModifierItem] = useState({
    name: '', price: 0, defaultSelected: false
  });
  const [editingGroupItemId, setEditingGroupItemId] = useState(null);

  const handleSaveItem = () => {
    if (editingItem) {
      setMenuItems(items => items.map(item => item.id === editingItem.id ? { ...editingItem } : item));
      setEditingItem(null);
    } else {
      const item = { id: Date.now(), ...newItem, price: parseFloat(newItem.price), available: true };
      setMenuItems(items => [...items, item]);
      setNewItem({ name: '', description: '', price: '', categoryId: categories[0]?.id || 1 });
    }
  };

  const handleSaveCategory = () => {
    const category = { id: Date.now(), ...newCategory, active: true };
    setCategories(cats => [...cats, category]);
    setNewCategory({ name: '', description: '', order: categories.length + 2 });
  };

  const handleDeleteItem = (id) => setMenuItems(items => items.filter(item => item.id !== id));
  const handleDeleteCategory = (id) => {
    setCategories(cats => cats.filter(cat => cat.id !== id));
    setMenuItems(items => items.filter(item => item.categoryId !== id));
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Sans catégorie';
  };

  // Modifier handlers
  const handleSaveGroup = () => {
    if (editingGroup) {
      setModifierGroups(groups => groups.map(g => g.id === editingGroup.id ? { ...editingGroup } : g));
      setEditingGroup(null);
    } else {
      const group = { id: Date.now(), ...newGroup, items: [] };
      setModifierGroups(groups => [...groups, group]);
      setNewGroup({ name: '', type: 'checkbox', minSelect: 0, maxSelect: 5 });
    }
  };

  const handleDeleteGroup = (id) => setModifierGroups(groups => groups.filter(g => g.id !== id));

  const addModifierItem = (groupId) => {
    if (!newModifierItem.name) return;
    setModifierGroups(groups => groups.map(g =>
      g.id === groupId ? { ...g, items: [...g.items, { id: Date.now(), ...newModifierItem, price: parseFloat(newModifierItem.price) || 0 }] } : g
    ));
    setNewModifierItem({ name: '', price: 0, defaultSelected: false });
  };

  const deleteModifierItem = (groupId, itemId) => {
    setModifierGroups(groups => groups.map(g =>
      g.id === groupId ? { ...g, items: g.items.filter(i => i.id !== itemId) } : g
    ));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion du Menu</h1>
          <p className="text-muted-foreground mt-2">Gérez vos catégories, articles et groupes de modificateurs</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          <button onClick={() => setActiveTab('categories')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Grid className="w-4 h-4 inline mr-2" />Catégories ({categories.length})
          </button>
          <button onClick={() => setActiveTab('items')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'items' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <List className="w-4 h-4 inline mr-2" />Articles ({menuItems.length})
          </button>
          <button onClick={() => setActiveTab('modifiers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'modifiers' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Sliders className="w-4 h-4 inline mr-2" />Modificateurs ({modifierGroups.length})
          </button>
        </nav>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Nouvelle Catégorie</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="text" placeholder="Nom de la catégorie" value={newCategory.name}
                onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background" />
              <input type="text" placeholder="Description" value={newCategory.description}
                onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background" />
              <div className="flex gap-2">
                <input type="number" placeholder="Ordre" value={newCategory.order}
                  onChange={(e) => setNewCategory({...newCategory, order: parseInt(e.target.value)})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background flex-1" />
                <button onClick={handleSaveCategory} disabled={!newCategory.name}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-foreground">{category.name}</h4>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                  <button onClick={() => handleDeleteCategory(category.id)}
                    className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Ordre: {category.order}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${category.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {category.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items Tab */}
      {activeTab === 'items' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">{editingItem ? "Modifier l'article" : 'Nouvel Article'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <input type="text" placeholder="Nom de l'article"
                value={editingItem ? editingItem.name : newItem.name}
                onChange={(e) => { if (editingItem) setEditingItem({...editingItem, name: e.target.value}); else setNewItem({...newItem, name: e.target.value}); }}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background" />
              <input type="text" placeholder="Description"
                value={editingItem ? editingItem.description : newItem.description}
                onChange={(e) => { if (editingItem) setEditingItem({...editingItem, description: e.target.value}); else setNewItem({...newItem, description: e.target.value}); }}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background" />
              <input type="number" step="0.01" placeholder="Prix"
                value={editingItem ? editingItem.price : newItem.price}
                onChange={(e) => { if (editingItem) setEditingItem({...editingItem, price: parseFloat(e.target.value)}); else setNewItem({...newItem, price: e.target.value}); }}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background" />
              <div className="flex gap-2">
                <select value={editingItem ? editingItem.categoryId : newItem.categoryId}
                  onChange={(e) => { if (editingItem) setEditingItem({...editingItem, categoryId: parseInt(e.target.value)}); else setNewItem({...newItem, categoryId: parseInt(e.target.value)}); }}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background flex-1">
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
                <button onClick={handleSaveItem}
                  disabled={editingItem ? !editingItem.name : !newItem.name}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                  <Save className="w-4 h-4" /> {editingItem ? 'Modifier' : 'Ajouter'}
                </button>
                {editingItem && (
                  <button onClick={() => setEditingItem(null)}
                    className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 flex items-center gap-2">
                    <X className="w-4 h-4" /> Annuler
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Article</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Catégorie</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Prix</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {menuItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">{item.name}</div>
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{getCategoryName(item.categoryId)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">{item.price.toFixed(2)} €</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {item.available ? 'Disponible' : 'Indisponible'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => setEditingItem(item)} className="text-primary hover:text-primary/80"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteItem(item.id)} className="text-destructive hover:text-destructive/80"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modifiers Tab */}
      {activeTab === 'modifiers' && (
        <div className="space-y-6">
          {/* Add Modifier Group */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingGroup ? 'Modifier le groupe' : 'Nouveau groupe de modificateurs'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input type="text" placeholder="Nom du groupe (ex: Burger - Suppléments)"
                value={editingGroup ? editingGroup.name : newGroup.name}
                onChange={(e) => { if (editingGroup) setEditingGroup({...editingGroup, name: e.target.value}); else setNewGroup({...newGroup, name: e.target.value}); }}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background" />
              <select value={editingGroup ? editingGroup.type : newGroup.type}
                onChange={(e) => { if (editingGroup) setEditingGroup({...editingGroup, type: e.target.value}); else setNewGroup({...newGroup, type: e.target.value}); }}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background">
                <option value="checkbox">Choix multiples (checkbox)</option>
                <option value="radio">Choix unique (radio)</option>
              </select>
              <input type="number" placeholder="Min sélections"
                value={editingGroup ? editingGroup.minSelect : newGroup.minSelect}
                onChange={(e) => { if (editingGroup) setEditingGroup({...editingGroup, minSelect: parseInt(e.target.value) || 0}); else setNewGroup({...newGroup, minSelect: parseInt(e.target.value) || 0}); }}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background" />
              <div className="flex gap-2">
                <input type="number" placeholder="Max sélections"
                  value={editingGroup ? editingGroup.maxSelect : newGroup.maxSelect}
                  onChange={(e) => { if (editingGroup) setEditingGroup({...editingGroup, maxSelect: parseInt(e.target.value) || 5}); else setNewGroup({...newGroup, maxSelect: parseInt(e.target.value) || 5}); }}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background flex-1" />
                <button onClick={handleSaveGroup} disabled={!((editingGroup || newGroup).name)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                  <Save className="w-4 h-4" /> {editingGroup ? 'Modifier' : 'Ajouter'}
                </button>
                {editingGroup && (
                  <button onClick={() => setEditingGroup(null)}
                    className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 flex items-center gap-2">
                    <X className="w-4 h-4" /> Annuler
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Modifier Groups List */}
          {modifierGroups.map((group) => (
            <div key={group.id} className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">{group.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {group.type === 'radio' ? 'Choix unique' : 'Choix multiples'} · Min: {group.minSelect} · Max: {group.maxSelect} · {group.items.length} option(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingGroup(group)} className="p-1 text-muted-foreground hover:text-primary"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDeleteGroup(group.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-4">
                {/* Add modifier item */}
                <div className="flex gap-2 mb-3">
                  <input type="text" placeholder="Nom de l'option (ex: Extra fromage)"
                    value={newModifierItem.name}
                    onChange={(e) => setNewModifierItem({...newModifierItem, name: e.target.value})}
                    className="px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background flex-1" />
                  <input type="number" step="0.50" placeholder="Prix"
                    value={newModifierItem.price || ''}
                    onChange={(e) => setNewModifierItem({...newModifierItem, price: e.target.value})}
                    className="px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background w-20" />
                  <button onClick={() => addModifierItem(group.id)} disabled={!newModifierItem.name}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Ajouter
                  </button>
                </div>
                {/* Items list */}
                <div className="space-y-1">
                  {group.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">Aucune option. Ajoutez des options ci-dessus.</p>
                  ) : (
                    group.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-1.5 px-3 bg-muted/20 rounded-md">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{item.name}</span>
                          {item.price > 0 && (
                            <span className="text-xs font-medium text-emerald-600">+{item.price.toFixed(2)} €</span>
                          )}
                          {item.price === 0 && <span className="text-xs text-muted-foreground">Inclus</span>}
                          {item.defaultSelected && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Défaut</span>}
                        </div>
                        <button onClick={() => deleteModifierItem(group.id, item.id)}
                          className="p-1 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
