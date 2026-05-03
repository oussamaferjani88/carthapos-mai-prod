import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Package, DollarSign, Tag, Grid, List } from 'lucide-react';
import { useThemeApplier } from '../hooks/useThemeApplier';
import { POSConfiguration } from '../lib/POSConfiguration';
import { useAppConfig } from '../hooks/useAppConfig';

const MenuManagement = () => {
  useThemeApplier();

  // POSConfiguration integration
  const { config: electronConfig } = useAppConfig();
  const getConfig = () => {
    if (electronConfig?.theme) {
      return POSConfiguration.createConfig(electronConfig.theme);
    }
    return POSConfiguration.createConfig({
      primaryColor: '#3b82f6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937'
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
    { id: 4, name: 'Café expresso', description: 'Café italien corsé', price: 2.50, categoryId: 4, available: true }
  ]);

  const [activeTab, setActiveTab] = useState('categories');
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: categories[0]?.id || 1
  });
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    order: categories.length + 1
  });

  const handleSaveItem = () => {
    if (editingItem) {
      setMenuItems(items => 
        items.map(item => 
          item.id === editingItem.id ? { ...editingItem } : item
        )
      );
      setEditingItem(null);
    } else {
      const item = {
        id: Date.now(),
        ...newItem,
        price: parseFloat(newItem.price),
        available: true
      };
      setMenuItems(items => [...items, item]);
      setNewItem({ name: '', description: '', price: '', categoryId: categories[0]?.id || 1 });
    }
  };

  const handleSaveCategory = () => {
    const category = {
      id: Date.now(),
      ...newCategory,
      active: true
    };
    setCategories(cats => [...cats, category]);
    setNewCategory({ name: '', description: '', order: categories.length + 2 });
  };

  const handleDeleteItem = (id) => {
    setMenuItems(items => items.filter(item => item.id !== id));
  };

  const handleDeleteCategory = (id) => {
    setCategories(cats => cats.filter(cat => cat.id !== id));
    setMenuItems(items => items.filter(item => item.categoryId !== id));
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Sans catégorie';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestion du Menu</h1>
          <p className="text-muted-foreground mt-2">
            Gérez vos catégories et articles de menu
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <Grid className="w-4 h-4 inline mr-2" />
            Catégories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'items'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            }`}
          >
            <List className="w-4 h-4 inline mr-2" />
            Articles ({menuItems.length})
          </button>
        </nav>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Add Category Form */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Nouvelle Catégorie</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Nom de la catégorie"
                value={newCategory.name}
                onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <input
                type="text"
                placeholder="Description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Ordre"
                  value={newCategory.order}
                  onChange={(e) => setNewCategory({...newCategory, order: parseInt(e.target.value)})}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background flex-1"
                />
                <button
                  onClick={handleSaveCategory}
                  disabled={!newCategory.name}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>
            </div>
          </div>

          {/* Categories List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-foreground">{category.name}</h4>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-1 text-muted-foreground hover:text-primary">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Ordre: {category.order}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    category.active 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                  }`}>
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
          {/* Add Item Form */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Modifier l\'article' : 'Nouvel Article'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Nom de l'article"
                value={editingItem ? editingItem.name : newItem.name}
                onChange={(e) => {
                  if (editingItem) {
                    setEditingItem({...editingItem, name: e.target.value});
                  } else {
                    setNewItem({...newItem, name: e.target.value});
                  }
                }}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <input
                type="text"
                placeholder="Description"
                value={editingItem ? editingItem.description : newItem.description}
                onChange={(e) => {
                  if (editingItem) {
                    setEditingItem({...editingItem, description: e.target.value});
                  } else {
                    setNewItem({...newItem, description: e.target.value});
                  }
                }}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Prix"
                value={editingItem ? editingItem.price : newItem.price}
                onChange={(e) => {
                  if (editingItem) {
                    setEditingItem({...editingItem, price: parseFloat(e.target.value)});
                  } else {
                    setNewItem({...newItem, price: e.target.value});
                  }
                }}
                className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              />
              <div className="flex gap-2">
                <select
                  value={editingItem ? editingItem.categoryId : newItem.categoryId}
                  onChange={(e) => {
                    if (editingItem) {
                      setEditingItem({...editingItem, categoryId: parseInt(e.target.value)});
                    } else {
                      setNewItem({...newItem, categoryId: parseInt(e.target.value)});
                    }
                  }}
                  className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background flex-1"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <div className="flex gap-1">
                  <button
                    onClick={handleSaveItem}
                    disabled={editingItem ? !editingItem.name : !newItem.name}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {editingItem ? 'Modifier' : 'Ajouter'}
                  </button>
                  {editingItem && (
                    <button
                      onClick={() => setEditingItem(null)}
                      className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Article
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Catégorie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Prix
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {menuItems.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-foreground">{item.name}</div>
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {getCategoryName(item.categoryId)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {item.price.toFixed(2)} €
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.available 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {item.available ? 'Disponible' : 'Indisponible'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="text-primary hover:text-primary/80"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
    </div>
  );
};

export default MenuManagement;
