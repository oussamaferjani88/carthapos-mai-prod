import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Plus, Edit, Trash2, Save, X, Grid, List, Package } from 'lucide-react';

export const POSMenuManagement = ({ config, setNotification }) => {
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
    categoryId: categories[0]?.id || 1,
    available: true
  });

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    order: categories.length + 1
  });

  const handleSaveCategory = () => {
    if (!newCategory.name) return;
    
    const category = {
      id: Date.now(),
      ...newCategory,
      active: true
    };
    
    setCategories(cats => [...cats, category]);
    setNewCategory({ name: '', description: '', order: categories.length + 2 });
    setNotification('Catégorie ajoutée avec succès!');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveItem = () => {
    if (editingItem) {
      setMenuItems(items => 
        items.map(item => 
          item.id === editingItem.id ? editingItem : item
        )
      );
      setEditingItem(null);
      setNotification('Article modifié avec succès!');
    } else {
      if (!newItem.name) return;
      
      const item = {
        id: Date.now(),
        ...newItem,
        price: parseFloat(newItem.price)
      };
      
      setMenuItems(items => [...items, item]);
      setNewItem({
        name: '',
        description: '',
        price: '',
        categoryId: categories[0]?.id || 1,
        available: true
      });
      setNotification('Article ajouté avec succès!');
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteItem = (id) => {
    setMenuItems(items => items.filter(item => item.id !== id));
    setNotification('Article supprimé!');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteCategory = (id) => {
    setCategories(cats => cats.filter(cat => cat.id !== id));
    setMenuItems(items => items.filter(item => item.categoryId !== id));
    setNotification('Catégorie supprimée!');
    setTimeout(() => setNotification(null), 3000);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Sans catégorie';
  };

  const styles = {
    card: {
      backgroundColor: config.backgroundColor,
      borderColor: config.cardBorderColor,
      color: config.textColor
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: config.textColor }}>Gestion du Menu</h1>
          <p style={{ color: config.textMutedColor }} className="mt-2">
            Gérez vos catégories et articles de menu
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: config.cardBorderColor }}>
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-primary text-primary'
                : 'border-transparent hover:border-gray-300'
            }`}
            style={{ 
              borderBottomColor: activeTab === 'categories' ? config.primaryColor : 'transparent',
              color: activeTab === 'categories' ? config.primaryColor : config.textMutedColor
            }}
          >
            <Grid className="w-4 h-4 inline mr-2" />
            Catégories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'items'
                ? 'border-primary text-primary'
                : 'border-transparent hover:border-gray-300'
            }`}
            style={{ 
              borderBottomColor: activeTab === 'items' ? config.primaryColor : 'transparent',
              color: activeTab === 'items' ? config.primaryColor : config.textMutedColor
            }}
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
          <Card style={styles.card}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Nouvelle Catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nom de la catégorie"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  style={{ 
                    borderColor: config.cardBorderColor,
                    backgroundColor: config.backgroundColor
                  }}
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  style={{ 
                    borderColor: config.cardBorderColor,
                    backgroundColor: config.backgroundColor
                  }}
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Ordre"
                    value={newCategory.order}
                    onChange={(e) => setNewCategory({...newCategory, order: parseInt(e.target.value)})}
                    className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 flex-1"
                    style={{ 
                      borderColor: config.cardBorderColor,
                      backgroundColor: config.backgroundColor
                    }}
                  />
                  <button
                    onClick={handleSaveCategory}
                    disabled={!newCategory.name}
                    className="px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                    style={{ backgroundColor: config.primaryColor }}
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categories List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category.id} style={styles.card}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold" style={{ color: config.textColor }}>{category.name}</h4>
                      <p className="text-sm" style={{ color: config.textMutedColor }}>{category.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-1 hover:text-primary" style={{ color: config.textMutedColor }}>
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span style={{ color: config.textMutedColor }}>Ordre: {category.order}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      category.active 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {category.active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Items Tab */}
      {activeTab === 'items' && (
        <div className="space-y-6">
          {/* Add Item Form */}
          <Card style={styles.card}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                {editingItem ? 'Modifier l\'article' : 'Nouvel Article'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  style={{ 
                    borderColor: config.cardBorderColor,
                    backgroundColor: config.backgroundColor
                  }}
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
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  style={{ 
                    borderColor: config.cardBorderColor,
                    backgroundColor: config.backgroundColor
                  }}
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
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  style={{ 
                    borderColor: config.cardBorderColor,
                    backgroundColor: config.backgroundColor
                  }}
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
                    className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 flex-1"
                    style={{ 
                      borderColor: config.cardBorderColor,
                      backgroundColor: config.backgroundColor
                    }}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button
                      onClick={handleSaveItem}
                      disabled={editingItem ? !editingItem.name : !newItem.name}
                      className="px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                      style={{ backgroundColor: config.primaryColor }}
                    >
                      <Save className="w-4 h-4" />
                      {editingItem ? 'Modifier' : 'Ajouter'}
                    </button>
                    {editingItem && (
                      <button
                        onClick={() => setEditingItem(null)}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items List */}
          <Card style={styles.card}>
            <CardContent className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: config.textMutedColor }}>
                      Article
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: config.textMutedColor }}>
                      Catégorie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: config.textMutedColor }}>
                      Prix
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: config.textMutedColor }}>
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: config.textMutedColor }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: config.cardBorderColor }}>
                  {menuItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium" style={{ color: config.textColor }}>{item.name}</div>
                          <div className="text-sm" style={{ color: config.textMutedColor }}>{item.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: config.textColor }}>
                        {getCategoryName(item.categoryId)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium" style={{ color: config.textColor }}>
                        {item.price.toFixed(2)} €
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.available 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.available ? 'Disponible' : 'Indisponible'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingItem(item)}
                            className="hover:opacity-80"
                            style={{ color: config.primaryColor }}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
